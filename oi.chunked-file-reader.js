/*
	Open Innovations ChunkedFileReader and ReadGeoJSONFeatures
	Created: 2022-10-27
	Author: Stuart Lowe
 */
(function(root){
	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}
	function ChunkedFileReader(input,opts){
		var log = new Log({"title":"ChunkedFileReader","version":"0.1"});
		this.log = log.message;
		this.log('log');

		if(!opts) opts = {};
		if(!input){
			this.log('error','No <input> provided');
			return this;
		}
		var chunk = (typeof opts.chunk==="number" ? opts.chunk : 65536);
		var delay = (typeof opts.delay==="number" ? opts.delay : 20);
		
		this.read = function(input){
			var myFile,size,i,blob,reader;
			i = 0;
			if(input.files && input.files[0]){
				myFile = input.files[0];
				size = myFile.size; //getting the file size so that we can use it for loop statement
				if(typeof opts.init==="function") opts.init.call(opts.this||_obj,{'size':size,'file':input.files[0]});
				function readChunk(i){
					blob = myFile.slice(i, i + chunk); //slice the file by specifying the index(chunk size)
					reader = new FileReader();
					reader.addEventListener('load',function(e){
						if(typeof opts.readChunk==="function") opts.readChunk.call(opts.this||_obj,e.target.result,i,i+chunk,size);
						if(typeof opts.progress==="function") opts.progress.call(opts.this||_obj,e.target.result,i,i+chunk,size);
						i += chunk;
						if(i < size) setTimeout(readChunk,delay,i);
						else{
							if(typeof opts.complete==="function") opts.complete.call(opts.this||_obj,{'size':size,'file':input.files[0]});
						}
					});
					reader.readAsBinaryString(blob);
				}
				// Start reading
				this.log('log','Starting to read %c'+myFile.name+'%c','font-style:italic','');
				readChunk(i);
			}
			return this;
		};

		var _obj = this;
		input.addEventListener("change",function(){ _obj.read(this); });

		return this;
	}
	function Log(opt){
		// Console logging version 2.0
		if(!opt) opt = {};
		if(!opt.title) opt.title = "Log";
		if(!opt.version) opt.version = "2.0";
		this.message = function(...args){
			var t = args.shift();
			if(typeof t!=="string") t = "log";
			var ext = ['%c'+opt.title+' '+opt.version+'%c'];
			if(args.length > 0){
				ext[0] += ':';
				if(typeof args[0]==="string") ext[0] += ' '+args.shift();
			}
			ext.push('font-weight:bold;');
			ext.push('');
			if(args.length > 0) ext = ext.concat(args);
			console[t].apply(null,ext);
		};
		return this;
	}
	function ReadGeoJSONFeatures(input,opts){
		this.collection = [];
		var c = 0;
		var str = '';
		var _obj = this;
		this.typ = '';
		function extractFeatures(typ,str){
			if(typ=="FeatureCollection"){
				var regex = RegExp(/(\{[\n\r\s]*"type"\s*:\s*"Feature".*?\})\,?[\n\r\s]*(\{[\n\r\s]*"type"\s*:\s*"Feature"|\]\}[\n\r\s]*$|[\n\r\s]*$)/);
				while(str.match(regex)){
					str = str.replace(regex,function(m,p1,p2){
						var json = null;
						try { json = JSON.parse(p1); }
						catch(err){ console.error(err); }
						if(json) _obj.collection.push(json);
						return p2;
					});
				}
			}else if(typ=="GeometryCollection"){
				var regex = RegExp(/(\{\s*"type"\s*:\s*"(Point|Polygon|MultiPolygon|LineString)"[^\}]*?\})/);
				while(str.match(regex)){
					str = str.replace(regex,function(m,p1){
						var json = null;
						try { json = JSON.parse(p1); }
						catch(err){ console.error(err); }
						if(json) _obj.collection.push(json);
						return "";
					});
				}
			}
			return str;
		}
		var defaults = {
			'delay': 5,
			'chunk': 65536,
			'init': function(){
				this.collection = [];
			},
			'readChunk': function(chunk,start,end,len){
				if(start==0){
					if(chunk.match(/"type":[\s]*"GeometryCollection"/)) this.typ = "GeometryCollection";
					else if(chunk.match(/"type":[\s]*"FeatureCollection"/)) this.typ = "FeatureCollection";
				}
				str = extractFeatures(this.typ,str+chunk);
				c++;
			},
			'this': this
		};
		merge(defaults,opts||{});
		OI.ChunkedFileReader(input,defaults);
		return this;
	}	
	// Recursively merge properties of two objects 
	function merge(obj1, obj2){
		for(var p in obj2){
			try{
				if(obj2[p].constructor==Object) obj1[p] = merge(obj1[p], obj2[p]);
				else obj1[p] = obj2[p];
			}catch(e){ obj1[p] = obj2[p]; }
		}
		return obj1;
	}
	OI.ChunkedFileReader = function(...args){ return new ChunkedFileReader(...args); }
	OI.ReadGeoJSONFeatures = function(...args){ return new ReadGeoJSONFeatures(...args); }

	root.OI = OI||root.OI||{};

})(window || this);