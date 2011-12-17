"use strict";

function queryStringToConfig (configStr) {
	var config = {};
	configStr = configStr.split("&");
	for (var i = 0; i < configStr.length; ++ i) {
		var varStr = configStr[i];
		var pos = varStr.search("=");
		var key, value;
		if (pos < 0) {
			key   = decodeURIComponent(varStr);
			value = undefined;
		}
		else {
			key   = decodeURIComponent(varStr.slice(0,pos));
			value = decodeURIComponent(varStr.slice(pos+1));
		}

		key = key.split('.');
		var ctx = config;
		var j = 0;
		for (var m = key.length - 1; j < m; ++ j) {
			var k = key[j];
			if (k in ctx) {
				ctx = ctx[k];
			}
			else {
				ctx = ctx[k] = {};
			}
		}
		ctx[key[j]] = value;
	}
	return config;
}

function setConfig(config) {
	if ('volume' in config) BrowserPonies.setVolume(config.volume);
	if ('fadeDuration' in config) BrowserPonies.setFadeDuration(config.fadeDuration);
	if ('fps' in config) BrowserPonies.setFps(config.fps);
	if ('speed' in config) BrowserPonies.setSpeed(config.speed);
	if ('audioEnabled' in config) BrowserPonies.setAudioEnabled(config.audioEnabled);
	if ('showFps' in config) BrowserPonies.setShowFps(config.showFps);
	if ('showLoadProgress' in config) BrowserPonies.setShowLoadProgress(config.showLoadProgress);
	if ('speakProbability' in config) BrowserPonies.setSpeakProbability(config.speakProbability);

	var random = config.spawnRandom || 0;
	var ponies = BrowserPonies.ponies();
	var spawn  = config.spawn || {};
	for (var name in ponies) {
		var pony  = ponies[name];
		var count = spawn[name] || 0;
		var diff  = count - pony.instances.length;
		
		if (diff > 0) {
			BrowserPonies.spawn(name, diff);
		}
		else if (random > -diff) {
			random += diff;
		}
		else {
			BrowserPonies.unspawn(name, -diff - random);
			random = 0;
		}
	}
	BrowserPonies.spawnRandom(random);
}

function updateConfig () {
	var config = dumpConfig();
	delete config.baseuri;
	setConfig(config);
	document.cookie = configToQueryString(config);
}

function loadConfig () {
	var config = document.cookie.split(/; */g)[0];
	if (config) {
		config = queryStringToConfig(config);
	}
	else {
		config = {
			spawn: {
				"rainbow dash": 1,
				"pinkie pie": 1,
				"applejack": 1,
				"twilight sparkle": 1,
				"fluttershy": 1,
				"rarity": 1
			}
		};
	}
	setConfig(config);
	
	setNumberFieldValue($('volume'), Math.round(BrowserPonies.getVolume() * 100));
	setNumberFieldValue($('fade'), BrowserPonies.getFadeDuration() / 1000);
	setNumberFieldValue($('fps'), BrowserPonies.getFps());
	setNumberFieldValue($('speak'), Math.round(BrowserPonies.getSpeakProbability() * 100));
	setNumberFieldValue($('speed'), BrowserPonies.getSpeed());
	$('progressbar').checked = BrowserPonies.isShowLoadProgress();
	$('enableaudio').checked = BrowserPonies.isAudioEnabled();
	$('showfps').checked     = BrowserPonies.isShowFps();

	setNumberFieldValue($('pony_random_pony_count'), config.spawnRandom || 0);
	var ponies = BrowserPonies.ponies();
	var spawn = config.spawn || {};
	for (var name in spawn) {
		var field = $(ponyCountId(name));
		if (field) {
			setNumberFieldValue(field, spawn[name] || 0);
		}
	}
	BrowserPonies.start();
}

function startPonies () {
	BrowserPonies.start();
	$('start').style.display = 'none';
	$('stop').style.display = '';
}

function stopPonies () {
	BrowserPonies.stop();
	$('start').style.display = '';
	$('stop').style.display = 'none';
}

function toggleSettings () {
	var settings = $('main');
	settings.style.display = settings.style.display == 'none' ? '' : 'none';
}

function loadPage () {
	var iframe = $('iframe');
	var url = window.location.hash.replace(/^#/,'');
	
	if (!/^[a-z0-9]+:/.test(url)) {
		url = "http://"+url.replace(/^\/+/,'');
	}

	if (url !== iframe.src) {
		iframe.src = url;
	}
}

window.onhashchange = loadPage;

BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
