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
		var c,str,_obj,reg;
		c = 0;
		str = '';
		_obj = this;
		this.typ = '';
		reg = {
			'FeatureCollection': RegExp(/\{[\n\r\s]*"type"[\n\r\s]*:[\n\r\s]*"Feature"/),
			'GeometryCollection': RegExp(/\{[\n\r\s]*"type"[\n\r\s]*:[\n\r\s]*"(Point|Polygon|MultiPolygon|LineString)"/)
		}
		function extractFeatures(typ,str){
			var rtn = extractFeature(str,reg[typ]);
			if(rtn.features) _obj.collection = _obj.collection.concat(rtn.features);
			return rtn.str;
		}
		function extractFeature(txt,re){
			var fs = [];
			var idx,rtn,done=false;
			while(txt.search(re) > 0 && !done){
				pos = txt.search(re);
				// Get the feature
				rtn = getUpToClosingBracket(txt,pos);
				txt = rtn.str;
				if(rtn.f){
					try {
						fs.push(JSON.parse(rtn.f));
					}catch(err){
						console.error('Invalid JSON',rtn.f);
					}
				}else done = true;
			}
			return {'features':fs,'str':txt};
		}
		function getUpToClosingBracket(txt,pos){
			let depth = 1;
			let newstr = txt[pos];
			let i;
			for(i = pos + 1; i < txt.length; i++){
				switch(txt[i]){
					case '{':
						depth++;
						break;
					case '}':
						if(--depth == 0) return {'f':newstr+txt[i],'str':txt.substr(i+1,)};
						break;
				}
				newstr += txt[i];
			}
			return {'f':'','str':txt};
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