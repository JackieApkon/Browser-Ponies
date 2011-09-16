"use strict";

// Shims:
if (!('trim' in String.prototype)) {
	String.prototype.trim = function () {
		return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	};
}

if (!('trimLeft' in String.prototype)) {
	String.prototype.trimLeft = function () {
		return this.replace(/^\s\s*/, '');
	};
}

if (!('trimRight' in String.prototype)) {
	String.prototype.trimRight = function () {
		return this.replace(/\s\s*$/, '');
	};
}

if (!('isArray' in Array)) {
	Array.isArray = function (object) {
		return Object.prototype.toString.call(object) === '[object Array]';
	};
}

if (!('bind' in Function.prototype)) {
	Function.prototype.bind = function (self) {
		var funct   = this;
		var partial = Array.prototype.slice.call(arguments,1);
		return function () {
			return funct.apply(self,partial.concat(Array.prototype.slice.call(arguments)));
		};
	};
}

if (!('now' in Date)) {
	Date.now = function () {
		return new Date().getTime();
	};
}

// dummy console object to prevent crashes on forgotten debug messages:
(function () {
	if (typeof(console) === "undefined") {
		window.console = {};
	}
	if (!('log' in window.console)) {
		window.console.log = function () {};
	}
	var methods = ['info', 'warn', 'error', 'trace', 'dir'];
	for (var i = 0, n = methods.length; i < n; ++ i) {
		var name = methods[i];
		if (!(name in window.console)) {
			window.console[name] = window.console.log;
		}
	}
})();

var BrowserPonies = (function () {
	var BaseZIndex = 900000;
	var observe = document.addEventListener ?
		function (element, event, handler) {
			element.addEventListener(event, handler, false);
		} :
		function (element, event, handler) {
			var wrapper = '_eventHandlingWrapper' in handler ?
				handler._eventHandlingWrapper :
				(handler._eventHandlingWrapper = function () {
					var event = window.event;
					if (!('stopPropagation' in event)) {
						event.stopPropagation = function () {
							this.cancelBubble = true;
						};
					}
					if (!('preventDefault' in event)) {
						event.preventDefault = function() {
							this.returnValue = false;
						};
					}
					if (!('target' in event)) {
						event.target = event.srcElement;
					}
					return handler(event);
				});
			element.attachEvent('on'+event, wrapper);
		};

	var stopObserving = document.removeEventListener ?
		function (element, event, handler) {
			element.removeEventListener(event, hander, false);
		} :
		function (element, event, handler) {
			element.detachEvent('on'+event,handler._eventHandlingWrapper);
		};

	var windowSize = 
		'innerWidth' in window ?
		function () {
			return {
				width:  window.innerWidth,
				height: window.innerHeight
			};
		} :
		function () {
			return {
				width:  document.documentElement.clientWidth,
				height: document.documentElement.clientHeight
			};
		};

	var bodySize = function () {
		return {
			width:  document.body.offsetWidth,
			height: document.body.offsetHeight
		};
	};
	
	var scrollPosition =
		'pageXOffset' in window ?
		function () {
			return {
				left: window.pageXOffset,
				top:  window.pageYOffset
			};
		} :
		function () {
			return {
				left: document.documentElement.scrollLeft,
				top:  document.documentElement.scrollTop
			};
		};

	var Opera = Object.prototype.toString.call(window.opera) === '[object Opera]';
	var IE = !!window.attachEvent && !Opera;
	var Gecko = navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1;
	var HasAudio = typeof(Audio) !== "undefined";
	var add = function (element, arg) {
		if (!arg) return;
		if (typeof(arg) === "string") {
			element.appendChild(document.createTextNode(arg));
		}
		else if (Array.isArray(arg)) {
			for (var i = 0, n = arg.length; i < n; ++ i) {
				add(element, arg[i]);
			}
		}
		else if (arg.nodeType === 1 || arg.nodeType === 3) {
			element.appendChild(arg);
		}
		else {
			for (var attr in arg) {
				var value = arg[attr];
				if (attr === "class" || attr === "className") {
					element.className = String(value);
				}
				else if (attr === "for" || attr === "htmlFor") {
					element.htmlFor = String(value);
				}
				else if (/^on/.test(attr)) {
					if (typeof(value) !== "function") {
						value = new Function("event",
							'if ((function (event) {\n'+value+
							'\n}).call(this,event) === false) { event.preventDefault(); }');
					}
					observe(element, attr.replace(/^on/,""), value);
				}
				else if (attr === 'style') {
					if (typeof(value) === "object") {
						for (var name in value) {
							var cssValue = value[name];
							element.style[name] = cssValue;
							if (name === 'float') {
								element.style.cssFloat   = cssValue;
								element.style.styleFloat = cssValue;
							}
							else if (IE && name === 'opacity') {
								element.style.filter = element.style.filter.replace(/\balpha\([^\)]*\)/gi,'') +
									'alpha(opacity='+(parseFloat(cssValue)*100)+')';
							}
						}
					}
					else {
						element.style.cssText += ";"+value;
					}
				}
				else if (attr === 'value' && element.nodeName === 'TEXTAREA') {
					element.value = value;
				}
				else if (value === true) {
					element.setAttribute(attr,attr);
				}
				else if (value === false) {
					element.removeAttribute(attr);
				}
				else {
					element.setAttribute(attr,String(value));
				}
			}
		}
	};

	var tag = function (name) {
		var element = document.createElement(name);
		for (var i = 1, n = arguments.length; i < n; ++ i) {
			add(element, arguments[i]);
		}
		return element;
	};

	var has = function (obj, name) {
		return Object.prototype.hasOwnProperty.call(obj, name);
	};

	var removeAll = function (array, item) {
		for (var i = 0; i < array.length;) {
			if (array[i] === item) {
				array.splice(i,1);
			}
			else {
				++ i;
			}
		}
	};
	
	var dataUrl = function (mimeType, data) {
		return 'data:'+mimeType+';base64,'+Base64.encode(data);
	};

	var escapeXml = function (s) {
		return s.replace(/&/g, '&amp;').replace(
			/</g, '&lt;').replace(/>/g, '&gt;').replace(
			/"/g, '&quot;').replace(/'/g, '&apos;');
	};

	var absUrl = function (url) {
		if ((/^\/\//).test(url)) {
			return window.location.protocol+url;
		}
		else if ((/^\//).test(url)) {
			return window.location.protocol+'//'+window.location.host+url;
		}
		else if ((/^[#\?]/).test(url)) {
			return window.location.protocol+'//'+window.location.host+window.location.pathname+url;
		}
		else if ((/^[a-z][-_a-z0-9]*:/i).test(url)) {
			return url;
		}
		else {
			var path = window.location.pathname.split('/');
			path.pop();
			if (path.length === 0) {
				path.push("");
			}
			path.push(url);
			return window.location.protocol+'//'+window.location.host+path.join("/");
		}
	};

	// inspired by:
	// http://farhadi.ir/posts/utf8-in-javascript-with-a-new-trick
	var Base64 = {
		encode: function (input) {
			return btoa(unescape(encodeURIComponent(input)));
		},
		decode: function (input) {
			return decodeURIComponent(escape(atob(input)));
		}
	};

	var PonyINI = {
		parse: function (text) {
			var lines = text.split(/\r?\n/);
			var rows = [];
			for (var i = 0, n = lines.length; i < n; ++ i) {
				var line = lines[i].trim();
				if (line.length === 0 || line.charAt(0) === "'")
					continue;
				var row = [];
				line = this.parseLine(line,row);
				if (line.length !== 0) {
					console.error("trailing text:",line);
				}
				rows.push(row);
			}
			return rows;
		},
		parseLine: function (line,row) {
			var pos;
			while ((line = line.trimLeft()).length > 0) {
				var ch = line.charAt(0);
				switch (ch) {
					case '"':
						line = line.slice(1);
						pos = line.search('"');
						if (pos < 0) pos = line.length;
						row.push(line.slice(0,pos));
						line = line.slice(pos);
						if (line.length > 0) {
							ch = line.charAt(0);
							if (ch === '"') {
								line = line.slice(1).trimLeft();
								ch = line.charAt(0);
							}
							if (line.length > 0) {
								if (ch === ',') {
									line = line.slice(1);
								}
								else if (ch !== '}') {
									console.error("data after quoted string:",line);
								}
							}
						}
						else {
							console.error("unterminated quoted string");
						}
						break;

					case ',':
						line = line.slice(1);
						row.push("");
						break;

					case '{':
						var nested = [];
						row.push(nested);
						line = this.parseLine(line.slice(1),nested).trimLeft();
						if (line.length > 0) {
							ch = line.charAt(0);
							if (ch !== '}') {
								console.log("data after list:",line);
							}
							else {
								line = line.slice(1).trimLeft();
								ch = line.charAt(0);
							}

							if (ch === ',') {
								line = line.slice(1);
							}
						}
						else {
							console.error("unterminated list");
						}
						break;

					case '}':
					case '\n':
						return line;

					default:
						pos = line.search(/[,}]/);
						if (pos < 0) pos = line.length;
						row.push(line.slice(0,pos).trim());
						line = line.slice(pos);
						if (line.length > 0) {
							ch = line.charAt(0);
							if (ch === ',') {
								line = line.slice(1);
							}
							else if (ch !== '}') {
								console.error("data string:",line);
							}
						}
				}
			}
			return line;
		}
	};

	var parseBoolean = function (value) {
		var s = value.toLowerCase().trim();
		if (s === "true") return true;
		else if (s === "false") return false;
		else throw new Error("illegal boolean value: "+value);
	};

	var $ = function (element_or_id) {
		if (typeof(element_or_id) === "string") {
			return document.getElementById(element_or_id);
		}
		else if (element_or_id && element_or_id.nodeType === 1) {
			return element_or_id;
		}
		else {
			return null;
		}
	};

	var distance = function (p1, p2) {
		var dx = p2.x - p1.x;
		var dy = p2.y - p1.y;
		return Math.sqrt(dx*dx + dy*dy);
	};

	var randomSelect = function (list) {
		return list[Math.round((list.length - 1) * Math.random())];
	};

	var Movements = {
		Left:      0,
		Right:     1,
		Up:        2,
		Down:      3,
		UpLeft:    4,
		UpRight:   5,
		DownLeft:  6,
		DownRight: 7
	};

	var AllowedMoves = {
		None:               0,
		HorizontalOnly:     1,
		VerticalOnly:       2,
        HorizontalVertical: 3,
        DiagonalOnly:       4,
        DiagonalHorizontal: 5,
        DiagonalVertical:   6,
        All:                7,
        MouseOver:          8,
        Sleep:              9
	};

	var Locations = {
		Top:           0,
		Bottom:        1,
		Left:          2,
		Right:         3,
		BottomRight:   4,
		BottomLeft:    5,
		TopRight:      6,
		TopLeft:       7,
		Center:        8,
		Any:           9,
		AnyNotCenter: 10
	};

	var locationName = function (loc) {
		for (var name in Locations) {
			if (Locations[name] === loc) {
				return name;
			}
		}
		return "Not a Location";
	};

	var camelize = function (s) {
		var parts = s.split(/[-_\s]/);
		var buf = [];
		for (var i = 0, n = parts.length; i < n; ++ i) {
			var part = parts[i];
			buf.push(part.slice(0,1).toUpperCase());
			buf.push(part.slice(1).toLowerCase());
		}
		return buf.join('');
	};

	var extend = function (dest, src) {
		for (var name in src) {
			dest[name] = src[name];
		}
		return dest;
	};

	var clone = function (obj) {
		return extend({}, obj);
	};

	var Interaction = function Interaction (interaction) {
		this.name        = interaction.name;
		this.probability = interaction.probability;
		this.proximity   = interaction.proximity === "default" ? 640 : interaction.proximity;
		this.all         = !!interaction.all;
		this.delay       = interaction.delay;
		this.targets     = [];
		this.behaviors   = [];

		for (var i = 0, n = interaction.behaviors.length; i < n; ++ i) {
			this.behaviors.push(interaction.behaviors[i].toLowerCase());
		}

		for (var i = 0, n = interaction.targets.length; i < n; ++ i) {
			var name = interaction.targets[i].toLowerCase();
			if (!has(ponies, name)) {
				console.warn("Interaction "+this.name+" of pony "+interaction.pony+
					" references non-existing pony "+name);
			}
			else {
				var pony = ponies[name];
				for (var j = 0, m = this.behaviors.length; j < m;) {
					var behavior = this.behaviors[j];
					if (has(pony.behaviors_by_name, behavior)) {
						 ++ j;
					}
					else {
						this.behaviors.splice(j, 1);
					}
				}
				this.targets.push(pony);
			}
		}
	};

	Interaction.prototype = {
		reachableTargets: function (pos) {
			var targets = [];
			for (var i = 0, n = this.targets.length; i < n; ++ i) {
				var pony = this.targets[i];
				for (var j = 0, m = pony.instances.length; j < m; ++ j) {
					var inst = pony.instances[j];
					if (distance(pos, inst.position()) < this.proximity) {
						targets.push(inst);
					}
				}
			}
			return targets;
		}
	};

	var Behavior = function Behavior (baseurl, behavior) {
		extend(this, behavior);
		
		if (this.follow) this.follow = this.follow.toLowerCase();
		this.movement = null;
		var movement  = behavior.movement.replace(/[-_\s]/,'').toLowerCase();

		for (var name in AllowedMoves) {
			if (name.toLowerCase() === movement) {
				this.movement = AllowedMoves[name];
				break;
			}
		}

		if (this.movement === null) {
			throw new Error("illegal movement: "+behavior.movement);
		}

		// Image preloading:
		if (behavior.rightimage) {
			this.rightimage = baseurl + behavior.rightimage;
			preload(this.rightimage, function (image) {
				this.rightsize = {
					width:  image.width,
					height: image.height
				};
			}.bind(this));
		}
		
		if (behavior.leftimage) {
			this.leftimage = baseurl + behavior.leftimage;
			preload(this.leftimage, function (image) {
				this.leftsize = {
					width:  image.width,
					height: image.height
				};
			}.bind(this));
		}

		this.effects         = [];
		this.effects_by_name = {};
		if ('effects' in behavior) {
			for (var i = 0, n = behavior.effects.length; i < n; ++ i) {
				var effect = new Effect(baseurl, behavior.effects[i]);
				this.effects_by_name[effect.name.toLowerCase()] = effect;
				this.effects.push(effect);	
			}
		}
	};

	Behavior.prototype = {
		isMoving: function () {
			switch (this.movement) {
				case AllowedMoves.None:
				case AllowedMoves.MouseOver:
				case AllowedMoves.Sleep:
					return false;
				default:
					return true;
			}
		}
	};

	var parseLocation = function (value) {
		var loc = value.replace(/[-_\s]/,'').toLowerCase();
		for (var name in Locations) {
			if (name.toLowerCase() === loc) {
				return Locations[name];
			}
		}
		throw new Error('illegal location: '+value);
	};
	
	var Effect = function Effect (baseurl, effect) {
		extend(this, effect);
		this.name = effect.name.toLowerCase();

		var locs = ['rightloc','leftloc','rightcenter','leftcenter'];
		for (var i = 0; i < locs.length; ++ i) {
			var name = locs[i];
			if (name in effect) {
				this[name] = parseLocation(effect[name]);
			}
		}

		// Image preloading:
		if (effect.rightimage) {
			this.rightimage = baseurl + effect.rightimage;
			preload(this.rightimage, function (image) {
				this.rightsize = {
					width:  image.width,
					height: image.height
				};
			}.bind(this));
		}
		
		if (effect.leftimage) {
			this.leftimage = baseurl + effect.leftimage;
			preload(this.leftimage, function (image) {
				this.leftsize = {
					width:  image.width,
					height: image.height
				};
			}.bind(this));
		}
	};

	// TODO: extend for other media and don't do it for all but only for spawned media
	var resources = {};
	var onload_callbacks = [];
	var allloaded = false;
	var checkAllLoaded = function () {
		for (var url in resources) {
			if (!resources[url].loaded) {
				return;
			}
		}
		allloaded = true;
		for (var i = 0, n = onload_callbacks.length; i < n; ++ i) {
			onload_callbacks[i]();
		}
		onload_callbacks = [];
	};
	var preload = function (imgurl,callback) {
		if (has(resources,imgurl)) {
			if (callback) {
				var loader = resources[imgurl];
				if (loader.loaded) {
					callback(loader.object);
				}
				else {
					loader.callbacks.push(callback);
				}
			}
		}
		else {
			var image = new Image();
			var loader = {
				object: image,
				loaded: false,
				callbacks: []
			};
			if (callback) {
				loader.callbacks.push(callback);
			}
			allloaded = false;
			resources[imgurl] = loader;
			observe(image, 'load', function () {
//				console.log('loaded',imgurl,image.width,'x',image.height);
				loader.loaded = true
				for (var i = 0, n = loader.callbacks.length; i < n; ++ i) {
					loader.callbacks[i](image);
				}
				delete loader.callbacks;
				checkAllLoaded();
			});
			image.src = imgurl;
		}
	};
	var docurl = document.location.href;
	resources[docurl] = {loaded: false};
	observe(window,'load',function () {
//		console.log('loaded',docurl);
		resources[docurl].loaded = true;
		checkAllLoaded();
	});
	var onload = function (callback) {
		if (allloaded) {
			callback();
		}
		else {
			onload_callbacks.push(callback);
		}
	};

	var Pony = function Pony (pony) {
		this.baseurl = globalBaseUrl + pony.baseurl;
		if (!pony.name) {
			throw new Error('pony with following base URL has no name: '+this.baseurl);
		}
		this.name      = pony.name;
		this.behaviors = [];
		this.mouseover_behaviors = [];
		this.behaviors_by_name   = {};
		this.speeches  = [];
		this.random_speeches  = [];
		this.speeches_by_name = {};
		this.interactions = []; // TODO
		this.instances    = [];
		
		if (pony.speeches) {
			for (var i = 0, n = pony.speeches.length; i < n; ++ i) {
				var speech = extend({},pony.speeches[i]);
				if (speech.file) {
					speech.file = this.baseurl + speech.file;
				}
				if (speech.name) {
					this.speeches_by_name[speech.name.toLowerCase()] = speech;
				}
				if (!speech.skip) {
					this.random_speeches.push(speech);
				}
				this.speeches.push(speech);
			}
		}

		var speakevents = ['speakstart','speakend'];
		if ('behaviors' in pony) {
			for (var i = 0, n = pony.behaviors.length; i < n; ++ i) {
				var behavior = new Behavior(this.baseurl, pony.behaviors[i]);
				this.behaviors_by_name[behavior.name.toLowerCase()] = behavior;
				for (var j = 0; j < speakevents.length; ++ j) {
					var speakevent = speakevents[j];
					var speechname = behavior[speakevent];
					if (speechname) {
						speechname = speechname.toLowerCase();
						if (has(this.speeches_by_name,speechname)) {
							behavior[speakevent] = this.speeches_by_name[speechname];
						}
						else {
							console.warn(this.baseurl+': Behavior '+behavior.name+' of pony '+pony.name+
								' references non-existing speech '+behavior[speakevent]);
							delete behavior[speakevent];
						}
					}
				}
				this.behaviors.push(behavior);

				if (behavior.movement === AllowedMoves.MouseOver) {
					this.mouseover_behaviors.push(behavior);
				}
			}

			for (var i = 0, n = this.behaviors.length; i < n; ++ i) {
				var behavior = this.behaviors[i];
				if (behavior.linked) {
					var linked = behavior.linked.toLowerCase();
					if (has(this.behaviors_by_name, linked)) {
						behavior.linked = this.behaviors_by_name[linked];
					}
					else {
						console.warn(this.baseurl+': Behavior '+behavior.name+' of pony '+this.name+
							' references non-existing behavior '+behavior.linked);
						delete behavior.linked;
					}
				}
			}
		}
	};

	Pony.prototype = {
		addInteraction: function (interaction) {
			interaction = new Interaction(interaction);

			if (interaction.targets.length === 0) {
				console.warn("Dropping interaction "+interaction.name+" of pony "+this.name+
					" because it has no targets.");
				return false;
			}
			
			for (var i = 0, n = interaction.behaviors.length; i < n;) {
				var behavior = interaction.behaviors[i];
				if (has(this.behaviors_by_name, behavior)) {
					 ++ i;
				}
				else {
					interaction.behaviors.splice(i, 1);
				}
			}

			if (interaction.behaviors.length === 0) {
				console.warn("Dropping interaction "+interaction.name+" of pony "+this.name+
					" because it has no common behaviors.");
				return false;
			}

			this.interactions.push(interaction);
			return true;
		}
	};

	var descendantOf = function (child, parent) {
		var node = child.parentNode;
		while (node) {
			if (node === parent) {
				return true;
			}
		}
		return false;
	};
	
	var isOffscreen = function (rect) {
		var winsize = windowSize();
		var wh = rect.width  * 0.5;
		var hh = rect.height * 0.5;
		return rect.x < wh || rect.y < hh ||
			rect.x + wh > winsize.width || 
			rect.y + hh > winsize.height;
	};

	var clipToScreen = function (rect) {
		var winsize = windowSize();
		var x = rect.x;
		var y = rect.y;
		var wh = rect.width  * 0.5;
		var hh = rect.height * 0.5;

		if (x < wh) {
			x = wh;
		}
		else if (x + wh > winsize.width) {
			x = winsize.width - wh;
		}

		if (y < hh) {
			y = hh;
		}
		else if (y + hh > winsize.height) {
			y = winsize.height - hh;
		}

		return {x: x, y: y};
	};

	var Instance = function Instance () {};
	Instance.prototype = {
		setTopLeftPosition: function (pos) {
			this.img.style.left = Math.round(pos.x)+'px';
			this.img.style.top  = Math.round(pos.y)+'px';
		},
		setPosition: function (pos) {
			this.img.style.left = Math.round(pos.x - this.current_size.width  * 0.5)+'px';
			this.img.style.top  = Math.round(pos.y - this.current_size.height * 0.5)+'px';
		},
		moveBy: function (offset) {
			this.img.style.left = Math.round(this.img.offsetLeft + offset.x)+'px';
			this.img.style.top  = Math.round(this.img.offsetTop  + offset.y)+'px';
		},
		clipToScreen: function () {
			this.setPosition(clipToScreen(this.rect()));
		},
		topLeftPosition: function () {
			return {
				x: this.img.offsetLeft,
				y: this.img.offsetTop
			};
		},
		position: function () {
			return {
				x: this.img.offsetLeft + this.current_size.width  * 0.5,
				y: this.img.offsetTop  + this.current_size.height * 0.5
			};
		},
		size: function () {
			return this.current_size;
		},
		rect: function () {
			return extend(this.position(), this.size());
		},
		topLeftRect: function () {
			return extend(this.topLeftPosition(), this.size());
		},
		isOffscreen: function () {
			return isOffscreen(this.rect());
		}
	};

	var PonyInstance = function PonyInstance (pony) {
		this.pony = pony;
		this.img  = tag('img', {
			draggable: 'false',
			style: {
				position:        "fixed",
				userSelect:      "none",
				borderStyle:     "none",
				margin:          "0",
				padding:         "0",
				backgroundColor: "transparent",
				zIndex:          String(BaseZIndex)
			},
			ondblclick: function () {
				// debug output
				var pos = this.position();
				var duration = String((this.end_time-this.start_time)/1000).split('.');
				if (duration.length > 1) {
					duration = duration[0]+'.'+duration[1].slice(0,2);
				}
				else {
					duration = duration[0];
				}
				console.log(this.pony.name+' does '+this.current_behavior.name+
					' for '+duration+' seconds'+
					', is at '+pos.x+' x '+pos.y+
					(this.following ?
						' and follows '+this.following.pony.name :
						' and wants to go to '+this.dest_position.x+' x '+this.dest_position.y)+
					'. See:',this);
			}.bind(this),
			onmousedown: function () {
				// timer === null means paused/not runnung
				if (this.pony.mouseover_behaviors.length > 0 && timer !== null) {
					this.behave(this.randomBehavior(true));
				}
				dragged = this;
				document.body.style.userSelect    = 'none';
				document.body.style.MozUserSelect = 'none';
			}.bind(this),
			onmousemove: function () {
				if (!this.mouseover) {
					this.mouseover = true;
					if ((!this.current_behavior || this.current_behavior.movement !== AllowedMoves.MouseOver) &&
							// timer === null means paused/not runnung
							this.pony.mouseover_behaviors.length > 0 && timer !== null) {
						this.behave(this.randomBehavior(true));
					}
				}
			}.bind(this),
			onmouseout: function (event) {
				var target = event.target;
				// XXX: the img has no descendants but if it had it might still be correct in case
				//      the relatedTarget is an anchester of the img or any node that is not a child
				//      of img or img itself.
//				if (this.mouseover && (target === this.img || !descendantOf(target, this.img))) {
				if (this.mouseover) {
					this.mouseover = false;
				}
			}.bind(this)
		});

		this.clear();
	};

	PonyInstance.prototype = extend(new Instance(), {
		// TODO
		clear: function () {
			if (this.effects) {
				for (var i = 0, n = this.effects.length; i < n; ++ i) {
					this.effects[i].clear();
				}
			}
			if (this.removing) {
				for (var i = 0, n = this.removing.length; i < n; ++ i) {
					var what = this.removing[i];
					if (what.element.parentNode) {
						what.element.parentNode.removeChild(what.element);
					}
				}
			}
			if (this.img.parentNode) {
				this.img.parentNode.removeChild(this.img);
			}
			this.start_time       = null;
			this.end_time         = null;
			this.interaction_wait = 0;
			this.current_size     = {width: 0, height: 0};
			this.current_behavior = null;
			this.facing_right     = true;
			this.end_at_dest      = false;
			this.effects          = [];
			this.repeating        = [];
			this.removing         = [];
		},
		interact: function (currentTime,interaction,targets) {
			this.interaction_wait = currentTime + interaction.delay;
			var behavior = randomSelect(interaction.behaviors);
			this.behave(this.pony.behaviors_by_name[behavior]);
			if (interaction.all) {
				for (var i = 0, n = targets.length; i < n; ++ i) {
					var pony = targets[i];
					pony.behave(pony.pony.behaviors_by_name[behavior]);
				}
			}
			else {
				var pony = randomSelect(targets);
				pony.behave(pony.pony.behaviors_by_name[behavior]);
			}
		},
		speak: function (currentTime,speech) {
			if (speech.text) {
//				console.log(this.pony.name+' says: '+speech.text);
				var duration = Math.max(speech.text.length * 200, 800);
				var text = tag('div',{
					style: {
						color:      "black",
						background: "white",
						position:   "fixed",
						visibility: "hidden",
						margin:     "0",
						padding:    "0",
						zIndex:     String(BaseZIndex + 1000)
					}}, speech.text);
				var rect = this.topLeftRect();
				getOverlay().appendChild(text);
				var x = Math.round(rect.x + rect.width * 0.5 - text.offsetWidth * 0.5);
				var y = rect.y + rect.height;
				text.style.left = x+'px';
				text.style.top  = y+'px';
				text.style.visibility = '';
				this.removing.push({
					element: text,
					at: currentTime + duration
				});
			}
			if (HasAudio && speech.file) {
				// TODO: preload
				var audio = new Audio();
				audio.src = speech.file;
				audio.play();
			}
		},
		update: function (currentTime, passedTime, winsize) {
			var curr = this.rect();

			// move back into screen:
			// TODO: implement bounce
			var wh = curr.width  * 0.5;
			var hh = curr.height * 0.5;
			if (curr.x + wh < 0 || 
				curr.y + hh < 0 ||
				curr.x - wh > winsize.width < 0 ||
				curr.y - hh > winsize.height) {
				this.behave(this.randomBehavior(false, true), true);
			}

			var dest = null;
			var dist;
			if (this.following) {
				if (this.following.img.parentNode) {
					dest = this.following.position();
					dest.x += this.following.facing_right ?
						this.current_behavior.x : -this.current_behavior.x;
					dest.y += this.current_behavior.y;
					dist = distance(curr, dest);
					if (!this.current_behavior.x && !this.current_behavior.y &&
						dist <= curr.width * 0.5) {
						dest = null;
					}
				}
				else {
					this.following = null;
				}
			}
			else {
				dest = this.dest_position;
				if (dest) dist = distance(curr, dest);
			}

			var pos;
			if (dest) {
				var dx = dest.x - curr.x;
				var dy = dest.y - curr.y;
				var tdist = this.current_behavior.speed * passedTime * 0.01 * globalSpeed;

				if (tdist >= dist) {
					pos = dest;
				}
				else {
					var scale = tdist / dist;
					pos = {
						x: curr.x + scale * dx,
						y: curr.y + scale * dy
					};
				}

				if (curr.x !== dest.x) {
					this.setFacingRight(curr.x < dest.x);
				}
				this.setPosition(pos);
/*
				console.log(
					"current: "+curr.x+" x "+curr.y+
					", step: "+pos.x+" x "+pos.y+
					", dest: "+dest.x+" x "+dest.y+
					", dist: "+dist+
					", dist for passed time: "+tdist);
*/
			}
			else {
//				this.clipToScreen();
				pos = curr;
			}

			for (var i = 0; i < this.effects.length;) {
				var effect = this.effects[i];
				if (effect.update(currentTime, passedTime, winsize)) {
					++ i;
				}
				else {
					if (effect.img.parentNode) {
						effect.img.parentNode.removeChild(effect.img);
					}
					this.effects.splice(i, 1);
				}
			}
			
			for (var i = 0, n = this.repeating.length; i < n; ++ i) {
				var what = this.repeating[i];
				if (what.at <= currentTime) {
//					console.log("repeating",what.effect.name);
					var inst = new EffectInstance(this, currentTime, what.effect);
					overlay.appendChild(inst.img);
					inst.updatePosition(currentTime, 0);
					this.effects.push(inst);
					what.at += what.effect.delay * 1000;
				}
			}
			
			for (var i = 0; i < this.removing.length;) {
				var what = this.removing[i];
				if (what.at <= currentTime) {
					if (what.element.parentNode) {
						what.element.parentNode.removeChild(what.element);
					}
					this.removing.splice(i, 1);
				}
				else {
					++ i;
				}
			}

			if (currentTime >= this.end_time || (this.end_at_dest && // !this.following && 
					this.dest_position.x === pos.x &&
					this.dest_position.y === pos.y)) {
				this.nextBehavior();
			}
		},
		getNearestInstance: function (name) {
			var nearObjects = [];
			var pos = this.position();
			var pony = ponies[name];
			var objs;
			
			if (!pony) {
				objs = [];
				// FIXME: slow
				for (var i = 0, n = instances.length; i < n; ++ i) {
					var inst = instances[i];
					for (var j = 0, m = inst.effects.length; j < m; ++ j) {
						var effect = inst.effects[j];
						if (effect.effect.name === name) {
							objs.push(effect);
						}
					}
				}
			}
			else {
				objs = pony.instances;
			}
			
			for (var i = 0, n = objs.length; i < n; ++ i) {
				var inst = objs[i];
				if (this !== inst) {
					nearObjects.push([distance(pos, inst.position()), inst]);
				}
			}
			if (nearObjects.length === 0) {
				return null;
			}
			nearObjects.sort();
			return nearObjects[0][1];
		},
		nextBehavior: function () {
			if (this.current_behavior && this.current_behavior.linked) {
				this.behave(this.current_behavior.linked, this.isOffscreen());
			}
			else {
				this.behave(this.randomBehavior(this.pony.mouseover_behaviors.length > 0 && this.mouseover),
					this.isOffscreen());
			}
		},
		setFacingRight: function (value) {
			this.facing_right = value;
			var newimg;
			if (value) {
				newimg = this.current_behavior.rightimage;
				this.current_size = this.current_behavior.rightsize;
			}
			else {
				newimg = this.current_behavior.leftimage;
				this.current_size = this.current_behavior.leftsize;
			}
			if (newimg !== this.img.getAttribute("src")) {
				this.img.src = newimg;
			}
		},
		behave: function (behavior, moveIntoScreen) {
			this.start_time = Date.now();
			var duration = behavior.minduration +
				(behavior.maxduration - behavior.minduration) * Math.random();
			this.end_time = this.start_time + duration * 1000;

			if (this.current_behavior && this.current_behavior.speakend) {
				this.speak(this.start_time, this.current_behavior.speakend);
			}

			this.current_behavior = behavior;

			var neweffects = [];
			for (var i = 0, n = this.effects.length; i < n; ++ i) {
				var inst = this.effects[i];
				if (inst.effect.duration) {
					neweffects.push(inst);
				}
				else if (inst.img.parentNode) {
					inst.img.parentNode.removeChild(inst.img);
				}
			}
			
			this.setFacingRight(this.facing_right);
			
			this.following = null;
			if (behavior.follow) {
				this.following = this.getNearestInstance(behavior.follow);
			}

			if (behavior.speakstart) {
				this.speak(this.start_time, behavior.speakstart);
			}
			else if (!behavior.speakend && !this.following &&
				this.pony.random_speeches.length > 0 &&
				Math.random() < speakChance) {
				this.speak(this.start_time, randomSelect(this.pony.random_speeches));
			}
			
			var pos = this.position();
			var size = this.size();
			var winsize = windowSize();
			this.end_at_dest = false;
			if (this.following) {
				this.dest_position = this.following.position();
			}
			else if (behavior.x && behavior.y) {
				this.end_at_dest = true;
				this.dest_position = {
					x: Math.round((winsize.width  - size.width)  * behavior.x / 100),
					y: Math.round((winsize.height - size.height) * behavior.y / 100)
				};
			}
			else {
				// TODO: reduce change of going off-screen
				var movements  = null;
				switch (behavior.movement) {
					case AllowedMoves.HorizontalOnly:
						movements = [Movements.Left, Movements.Right];
						break;

					case AllowedMoves.VerticalOnly:
						movements = [Movements.Up, Movements.Down];
						break;

					case AllowedMoves.HorizontalVertical:
						movements = [Movements.Left, Movements.Right,
						             Movements.Up, Movements.Down];
						break;

					case AllowedMoves.DiagonalOnly:
						movements = [Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.DiagonalHorizontal:
						movements = [Movements.Left, Movements.Right,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.DiagonalVertical:
						movements = [Movements.Up, Movements.Down,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.All:
						movements = [Movements.Left, Movements.Right,
						             Movements.Up, Movements.Down,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;
				}

				if (movements === null) {
					this.dest_position = pos;
				}
				else {
					var nearTop    = pos.y - size.height * 0.5 < 100;
					var nearBottom = pos.y + size.height * 0.5 + 100 > winsize.height;
					var nearLeft   = pos.x - size.width * 0.5 < 100;
					var nearRight  = pos.x + size.width * 0.5 + 100 > winsize.width;
					var reducedMovements = movements.slice();

					if (nearTop) {
						removeAll(reducedMovements, Movements.Up);
						removeAll(reducedMovements, Movements.UpLeft);
						removeAll(reducedMovements, Movements.UpRight);
					}
					
					if (nearBottom) {
						removeAll(reducedMovements, Movements.Down);
						removeAll(reducedMovements, Movements.DownLeft);
						removeAll(reducedMovements, Movements.DownRight);
					}
					
					if (nearLeft) {
						removeAll(reducedMovements, Movements.Left);
						removeAll(reducedMovements, Movements.UpLeft);
						removeAll(reducedMovements, Movements.DownLeft);
					}
					
					if (nearRight) {
						removeAll(reducedMovements, Movements.Right);
						removeAll(reducedMovements, Movements.UpRight);
						removeAll(reducedMovements, Movements.DownRight);
					}

					// speed is in pixels/100ms, duration is in sec
					var dist = behavior.speed * duration * 100 * globalSpeed;

					var a;
					switch (randomSelect(reducedMovements.length === 0 ? movements : reducedMovements)) {
						case Movements.Up:
							this.dest_position = {
								x: pos.x,
								y: pos.y - dist
							};
							break;
						case Movements.Down:
							this.dest_position = {
								x: pos.x,
								y: pos.y + dist
							};
							break;
						case Movements.Left:
							this.dest_position = {
								x: pos.x - dist,
								y: pos.y
							};
							break;
						case Movements.Right:
							this.dest_position = {
								x: pos.x + dist,
								y: pos.y
							};
							break;
						case Movements.UpLeft:
							a = Math.sqrt(dist*dist*0.5);
							this.dest_position = {
								x: pos.x - a,
								y: pos.y - a
							};
							break;
						case Movements.UpRight:
							a = Math.sqrt(dist*dist*0.5);
							this.dest_position = {
								x: pos.x + a,
								y: pos.y - a
							};
							break;
						case Movements.DownLeft:
							a = Math.sqrt(dist*dist*0.5);
							this.dest_position = {
								x: pos.x - a,
								y: pos.y + a
							};
							break;
						case Movements.DownRight:
							a = Math.sqrt(dist*dist*0.5);
							this.dest_position = {
								x: pos.x + a,
								y: pos.y + a
							};
							break;
					}

					if (moveIntoScreen) {
						this.dest_position = clipToScreen(extend(this.dest_position, size));
						this.end_at_dest   = true;
					}

					this.dest_position.x = Math.round(this.dest_position.x);
					this.dest_position.y = Math.round(this.dest_position.y);
				}

				this.setFacingRight(
					pos.x !== this.dest_position.x ?
					pos.x < this.dest_position.x :
					this.facing_right);
			}

			var overlay = getOverlay();
			this.repeating = [];
			for (var i = 0, n = behavior.effects.length; i < n; ++ i) {
				var effect = behavior.effects[i];
				var inst = new EffectInstance(this, this.start_time, effect);
				overlay.appendChild(inst.img);
				inst.updatePosition(this.start_time, 0);
				neweffects.push(inst);

				if (effect.delay) {
					this.repeating.push({
						effect: effect,
						at: this.start_time + effect.delay * 1000
					});
				}
			}
			this.effects = neweffects;
/*
			var msg;
			if (this.following) {
				msg = "following "+this.following.pony.name;
			}
			else if (this.dest_position.x !== pos.x || this.dest_position.y !== pos.y) {
				msg = "move from "+pos.x+" x "+pos.y+" to "+
					Math.round(this.dest_position.x)+" x "+
					Math.round(this.dest_position.y);
			}
			else {
				msg = "no movement";
			}
			console.log(this.pony.name+" does "+behavior.name+": "+msg+" in "+duration+
				" seconds");
*/
		},
		teleport: function () {
			var winsize = windowSize();
			var size = this.size();
			this.setPosition({
				x: Math.random() * (winsize.width  - (size.width || 106)),
				y: Math.random() * (winsize.height - (size.height || 96))
			});
		},
		randomBehavior: function (mouseover, forceMovement) {
			var behaviors = mouseover ?
				this.pony.mouseover_behaviors :
				this.pony.behaviors;
			var sumprob = 0;
			for (var i = 0, n = behaviors.length; i < n; ++ i) {
				var behavior = behaviors[i];
				if (behavior.skip || (forceMovement && !behavior.isMoving())) continue;
				sumprob += behavior.probability;
			}
			var dice = Math.random() * sumprob;
			var diceiter = 0;
			for (var i = 0, n = behaviors.length; i < n; ++ i) {
				var behavior = behaviors[i];
				if (behavior.skip || (forceMovement && !behavior.isMoving())) continue;
				diceiter += behavior.probability;
				if (dice <= diceiter) {
					return behavior;
				}
			}
			return null;
		}
	});

	var EffectInstance = function EffectInstance (pony, start_time, effect) {
		this.pony       = pony;
		this.start_time = start_time;
		var duration = effect.duration * 1000;
		// XXX: Gecko gif animations speed is buggy!
		if (Gecko) duration *= 0.6;
		this.end_time = start_time + duration;
		this.effect   = effect;
		
		var imgurl;
		if (pony.facing_right) {
			imgurl = this.effect.rightimage;
			this.current_size = this.effect.rightsize;
		}
		else {
			imgurl = this.effect.leftimage;
			this.current_size = this.effect.leftsize;
		}

		this.previous_image = null;
		this.img = tag(Gecko ? 'img' : 'iframe', {
			draggable: 'false',
			style: {
				position:        "fixed",
				overflow:        "hidden",
				userSelect:      "none",
				pointerEvents:   "none",
				borderStyle:     "none",
				margin:          "0",
				padding:         "0",
				backgroundColor: "transparent",
				zIndex:          String(BaseZIndex + 1000)
			}});
		if (IE) {
			this.img.frameborder  = "0";
			this.img.scrolling    = "no";
			this.img.marginheight = "0";
			this.img.marginwidth  = "0";
		}
		this.setImage(imgurl);

		var locs = ['rightloc','rightcenter','leftloc','leftcenter'];
		for (var i = 0, n = locs.length; i < n; ++ i) {
			var name = locs[i];
			var loc = effect[name];

			if (loc === Locations.Any) {
				loc = randomSelect([
					Locations.Top, Locations.Bottom, Locations.Left, Locations.Right,
					Locations.BottomRight, Locations.BottomLeft, Locations.TopRight, Locations.TopLeft,
					Locations.Center
				]);
			}
			else if (loc === Locations.AnyNotCenter) {
				loc = randomSelect([
					Locations.Top, Locations.Bottom, Locations.Left, Locations.Right,
					Locations.BottomRight, Locations.BottomLeft, Locations.TopRight, Locations.TopLeft
				]);
			}

			this[name] = loc;
		}
	};

	EffectInstance.prototype = extend(new Instance(), {
		clear: function () {
			if (this.img.parentNode) {
				this.img.parentNode.removeChild(this.img);
			}
		},
		updatePosition: function (currentTime, passedTime) {
			var loc, center;
			if (this.pony.facing_right) {
				loc = this.rightloc;
				center = this.rightcenter;
			}
			else {
				loc = this.leftloc;
				center = this.leftcenter;
			}

			var size = this.size();
			var pos;

			switch (center) {
				case Locations.Top:
					pos = {x: -size.width * 0.5, y: 0};
					break;
				case Locations.Bottom:
					pos = {x: -size.width * 0.5, y: -size.height};
					break;
				case Locations.Left:
					pos = {x: 0, y: -size.height * 0.5};
					break;
				case Locations.Right:
					pos = {x: -size.width, y: -size.height * 0.5};
					break;
				case Locations.BottomRight:
					pos = {x: -size.width, y: -size.height};
					break;
				case Locations.BottomLeft:
					pos = {x: 0, y: -size.height};
					break;
				case Locations.TopRight:
					pos = {x: -size.width, y: 0};
					break;
				case Locations.TopLeft:
					pos = {x: 0, y: 0};
					break;
				case Locations.Center:
					pos = {x: -size.width * 0.5, y: -size.height * 0.5};
					break;
			}
			
			var ponyRect = this.pony.topLeftRect();
			switch (loc) {
				case Locations.Top:
					pos.x += ponyRect.x + ponyRect.width * 0.5;
					pos.y += ponyRect.y;
					break;
				case Locations.Bottom:
					pos.x += ponyRect.x + ponyRect.width * 0.5;
					pos.y += ponyRect.y + ponyRect.height;
					break;
				case Locations.Left:
					pos.x += ponyRect.x;
					pos.y += ponyRect.y + ponyRect.height * 0.5;
					break;
				case Locations.Right:
					pos.x += ponyRect.x + ponyRect.width;
					pos.y += ponyRect.y + ponyRect.height * 0.5;
					break;
				case Locations.BottomRight:
					pos.x += ponyRect.x + ponyRect.width;
					pos.y += ponyRect.y + ponyRect.height;
					break;
				case Locations.BottomLeft:
					pos.x += ponyRect.x;
					pos.y += ponyRect.y + ponyRect.height;
					break;
				case Locations.TopRight:
					pos.x += ponyRect.x + ponyRect.width;
					pos.y += ponyRect.y;
					break;
				case Locations.TopLeft:
					pos.x += ponyRect.x;
					pos.y += ponyRect.y;
					break;
				case Locations.Center:
					pos.x += ponyRect.x + ponyRect.width  * 0.5;
					pos.y += ponyRect.y + ponyRect.height * 0.5;
					break;
			}

			this.setTopLeftPosition(pos);
		},
		/*
		setImage: function (url) {
			if (this.previous_image !== url) {
				this.img.src = dataUrl('text/html',
					'<html><head><title>'+Math.random()+
					'</title><style text="text/css">html,body{margin:0;padding:0;background:transparent;}</style><body></body><img src="'+
					escapeXml(absUrl(url))+'"/></html>');
				this.img.style.width  = this.current_size.width+"px";
				this.img.style.height = this.current_size.height+"px";
				this.previous_image = url;
			}
		},
		*/
		setImage: function (url) {
			if (this.previous_image !== url) {
				this.img.src = url;
				this.img.style.width  = this.current_size.width+"px";
				this.img.style.height = this.current_size.height+"px";
				this.previous_image = url;
			}
		},
		update: function (currentTime, passedTime, winsize) {
			if (this.effect.follow) {
				this.updatePosition(currentTime, passedTime);
				
				var imgurl;
				if (this.pony.facing_right) {
					imgurl = this.effect.rightimage;
					this.current_size = this.effect.rightsize;
				}
				else {
					imgurl = this.effect.leftimage;
					this.current_size = this.effect.leftsize;
				}
				this.setImage(imgurl);
			}
			// TODO: repeat. where? when?
			return !this.effect.duration || currentTime < this.end_time;
		}
	});

	var lastTime = Date.now();
	var tick = function () {
		var time = Date.now();
		var span = time - lastTime;
		var winsize = windowSize();
		for (var i = 0, n = instances.length; i < n; ++ i) {
			instances[i].update(time, span, winsize);
		}
		lastTime = time;

		// fix stacking order:
		instances.sort(function (lhs, rhs) {
			return (lhs.img.offsetTop + lhs.img.offsetHeight) - (rhs.img.offsetTop + rhs.img.offsetHeight);
		});
		for (var i = 0, n = instances.length; i < n; ++ i) {
			var inst = instances[i];
			var zIndex = String(BaseZIndex + i);
			inst.img.style.zIndex = zIndex;
			/* TODO
			for (var j = 0, m = inst.length; j < m; ++ j) {
				inst.effects[j].img.style.zIndex = zIndex;
			}
			*/
		}
	};

	var globalBaseUrl = '';
	var globalSpeed = 3; // why is it too slow otherwise?
	var speakChance = 0.25;
	var interval = 40;
	var ponies = {};
	var instances = [];
	var overlay = null;
	var timer = null;
	var mousePosition = null;
	var dragged = null;

	var getOverlay = function () {
		if (!overlay) {
			overlay = tag('div', {id: 'browser-ponies'});
		}
		if (!overlay.parentNode) {
			document.body.appendChild(overlay);
		}
		return overlay;
	};

	observe(window, 'mousemove', function (event) {
		if (!mousePosition) {
			mousePosition = {
				x: event.clientX,
				y: event.clientY
			};
		}
		if (dragged) {
			dragged.moveBy({
				x: event.clientX - mousePosition.x,
				y: event.clientY - mousePosition.y
			});
		}
		mousePosition.x = event.clientX;
		mousePosition.y = event.clientY;
	});
	
	observe(window, 'mouseup', function (event) {
		if (dragged) {
			dragged = null;
			document.body.style.userSelect    = '';
			document.body.style.MozUserSelect = '';
		}
	});

	return {
		convertPony: function (ini, baseurl) {
			var rows = PonyINI.parse(ini);
			var pony = {
				baseurl:   baseurl || "",
				behaviors: [],
				speeches:  []
			};
			var behaviors_by_name = {};
			var effects = [];

			for (var i = 0, n = rows.length; i < n; ++ i) {
				var row = rows[i];
				var type = row[0].toLowerCase();

				switch (type) {
					case "name":
						pony.name = row[1];
						break;
						
					case "behavior":
						var behavior = {
							name: row[1],
							probability: parseFloat(row[2]),
							maxduration: parseFloat(row[3]),
							minduration: parseFloat(row[4]),
							speed:       parseFloat(row[5]),
							rightimage:  row[6],
							leftimage:   row[7],
							movement:    row[8],
							skip:        false,
							effects:     []
						};
						if (row.length > 9) {
							if (row[9]) behavior.linked = row[9];
							var speakstart = (row[10] || '').trim();
							if (speakstart) behavior.speakstart = speakstart;
							var speakend = (row[11] || '').trim();
							if (speakend)   behavior.speakend   = speakend;
							behavior.skip = parseBoolean(row[12]);
							behavior.x    = parseFloat(row[13]);
							behavior.y    = parseFloat(row[14]);
							if (row[15]) behavior.follow = row[15];
						}
						pony.behaviors.push(behavior);
						behaviors_by_name[behavior.name.toLowerCase()] = behavior;
						break;
						
					case "effect":
						var effect = {
							name:        row[1],
							behavior:    row[2],
							rightimage:  row[3],
							leftimage:   row[4],
							duration:    parseFloat(row[5]),
							delay:       parseFloat(row[6]),
							rightloc:    row[7].trim(),
							rightcenter: row[8].trim(),
							leftloc:     row[9].trim(),
							leftcenter:  row[10].trim(),
							follow:      parseBoolean(row[11])
						};
						effects.push(effect);
						break;
						
					case "speak":
						var speak;
						if (row.length === 2) {
							speak = {
								text: row[1],
								skip: false
							};
						}
						else {
							speak = {
								name: row[1],
								text: row[2].trim(),
								skip: row[4] ? parseBoolean(row[4]) : false
							};
							if (row[3]) speak.file = row[3];
						}
						pony.speeches.push(speak);
						break;

					default:
						console.warn(baseurl+": Unknown pony setting:",row);
				}
			}
			
			if (!('name' in pony)) {
				throw new Error('Pony with following base URL has no name: '+pony.baseurl);
			}

			for (var i = 0, n = effects.length; i < n; ++ i) {
				var effect = effects[i];
				var behavior = effect.behavior.toLowerCase();
				if (!has(behaviors_by_name,behavior)) {
					console.warn(baseurl+": Effect "+effect.name+" of pony "+pony.name+
						" references non-existing behavior "+effect.behavior);
				}
				else {
					behaviors_by_name[behavior].effects.push(effect);
					delete effect.behavior;
				}
			}

			return pony;
		},
		convertInteractions: function (ini) {
			var rows = PonyINI.parse(ini);
			var interactions = [];

			for (var i = 0, n = rows.length; i < n; ++ i) {
				var row = rows[i];
				var all = false;
				if (row.length > 4) {
					all = row[5].trim().toLowerCase();
					if (all === "true" || all === "all") {
						all = true;
					}
					else if (all === "false" || all == "random" || all === "any") {
						all = false;
					}
					else {
						throw new Error("illegal value: "+row[5]);
					}
				}

				var proximity = row[3].trim().toLowerCase();
				if (proximity !== "default") proximity = parseFloat(proximity);
				interactions.push({
					name:        row[0],
					pony:        row[1],
					probability: parseFloat(row[2]),
					proximity:   proximity,
					targets:     row[4],
					all:         all,
					behaviors:   row[6],
					delay:       row.length > 7 ? parseFloat(row[7].trim()) : 0
				});
			}

			return interactions;
		},
		addInteractions: function (interactions) {
			if (typeof(interactions) === "string") {
				interactions = this.convertInteractions(interactions);
			}
			for (var i = 0, n = interactions.length; i < n; ++ i) {
				this.addInteraction(interactions[i]);
			}
		},
		addInteraction: function (interaction) {
			var lowername = interaction.pony.toLowerCase();
			if (!has(ponies,lowername)) {
				console.error("No such pony:",interaction.pony);
				return false;
			}
			return ponies[lowername].addInteraction(interaction);
		},
		addPonies: function (ponies) {
			for (var i = 0, n = ponies.length; i < n; ++ i) {
				this.addPony(ponies[i]);
			}
		},
		addPony: function (pony) {
			if (pony.ini) {
				pony = this.convertPony(pony.ini, pony.baseurl);
			}
			if (pony.behaviors.length === 0) {
				console.error("Pony "+pony.name+" has no behaviors.");
				return false;
			}
			ponies[pony.name.toLowerCase()] = new Pony(pony);
			return true;
		},
		spawn: function (name, count) {
			var lowername = name.toLowerCase();
			if (!has(ponies,lowername)) {
				console.error("No such pony:",name);
				return false;
			}
			var pony = ponies[lowername];
			if (count === undefined) count = 1;
			while (count > 0) {
				var inst = new PonyInstance(pony);
				instances.push(inst);
				pony.instances.push(inst);
				if (timer !== null) {
					onload(function () {
						getOverlay().appendChild(inst.img);
						inst.teleport();
						inst.nextBehavior();
					});
				}
				-- count;
			}
			return true;
		},
		unspawnAll: function () {
			instances = [];
			for (var i = 0, n = ponies.length; i < n; ++ i) {
				ponies[i].instances = [];
			}
		},
		start: function () {
			onload(function () {
				var overlay = getOverlay();
				overlay.innerHTML = '';
				for (var i = 0, n = instances.length; i < n; ++ i) {
					var inst = instances[i];
					inst.clear();
					overlay.appendChild(inst.img);
					inst.teleport();
					inst.nextBehavior();
				}
				if (timer === null) {
					lastTime = Date.now();
					timer = setInterval(tick, interval);
				}
			});
		},
		stop: function () {
			if (overlay) {
				overlay.parentNode.removeChild(overlay);
				overlay.innerHTML = '';
				overlay = null;
			}
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
		},
		pause: function () {
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
		},
		resume: function () {
			getOverlay();
			onload(function () {
				if (timer === null) {
					lastTime = Date.now();
					timer = setInterval(tick, interval);
				}
			});
		},
		setInterval: function (time) {
			interval = time;
			if (timer !== null) {
				clearInterval(timer);
				timer = setInterval(tick, interval);
			}
		},
		getInterval: function () {
			return interval;
		},
		setSpeakChance: function (chance) {
			speakChance = chance;
		},
		getSpeakChance: function () {
			return speakChance;
		},
		setBaseUrl: function (url) {
			globalBaseUrl = url;
		},
		getBaseUrl: function () {
			return globalBaseUrl;
		},
		setSpeed: function (speed) {
			globalSpeed = speed;
		},
		getSpeed: function () {
			return globalSpeed;
		},
		running: function () {
			return timer !== null;
		},
		ponies: function () {
			return ponies;
		}
	};
})();

(function () {
	if (typeof(BrowserPoniesConfig) !== "undefined") {
		if ('baseurl' in BrowserPoniesConfig) {
			BrowserPonies.setBaseUrl(BrowserPoniesConfig.baseurl);
		}
		if ('speakChance' in BrowserPoniesConfig) {
			BrowserPonies.setSpeakChance(BrowserPoniesConfig.speakChance);
		}
		if ('interval' in BrowserPoniesConfig) {
			BrowserPonies.setInterval(BrowserPoniesConfig.interval);
		}
		if (BrowserPoniesConfig.ponies) {
			BrowserPonies.addPonies(BrowserPoniesConfig.ponies);
		}
		if (BrowserPoniesConfig.interactions) {
			BrowserPonies.addInteractions(BrowserPoniesConfig.interactions);
		}
		if (BrowserPoniesConfig.spawn) {
			for (var name in BrowserPoniesConfig.spawn) {
				BrowserPonies.spawn(name, BrowserPoniesConfig.spawn[name]);
			}
		}
	}
})();
