
// Phantom Runner?
var SJTest4Phantom = {};


/**
 * Go through the queue loading & running tests
 */
SJTest4Phantom._doThemAll = function() {
//		if (SJTest.q.length==0) {
//			setTimeout(SJTest._doThemAll(), 50);
//			return;
//		}
	var url = SJTest4Phantom._pagesToLoad.pop();
	var cback = function() {
		SJTest4Phantom._doThemAll();
	};
	// console.log("url="+url+" from ", SJTest.q);
	assert(url);
	assert(SJTest.phantomjsTopLevel, SJTest);
	var page = require('webpage').create();
	// echo console messages
	page.onConsoleMessage = function(msg){
		console.log(msg); // filter by LOGTAG
		var m = msg.match(/SJTest:(\S+) (.+)/);
		if ( ! m) return;
		var mcode=m[1], testName=m[2];
		if (mcode==='pass') {
			SJTest4Phantom.passed.push(testName);
		} else if (mcode==='fail') {
			SJTest4Phantom.failed.push(testName);
		} else if (mcode==='skip') {
			SJTest4Phantom.skipped.push(testName);
		}
	};

	 // Switch SJTest on!
	if (url.indexOf('SJTest=')==-1) {
		if (url.indexOf('?')!=-1) url += "&SJTest=on"; else url += "?SJTest=on";
	}
	page.open(url, cback);
	SJTest4Phantom._pagesInProcessing.push(page);
	console.log("PhantomJS opened: "+url+"...");
}; // ./ doThemAll


SJTest4Phantom.passed = [];
SJTest4Phantom.failed = [];
SJTest4Phantom.skipped = [];

SJTest4Phantom.goPhantom = function() {
	var args = require('system').args;
	if (args[0].substr( - 'SJTest.js'.length) === 'SJTest.js') {
		SJTest.on = true;
	} else {
		console.warn("SJTest OFF: Did not recognise script "+args[0]);
	}
	if (args.length === 1) {
		console.log('SJTest version '+SJTest.version+' by Daniel Winterstein');
	    console.log('Usage: phantomjs SJTest.js MyTestFile1.html MyTestFile2.html ...');
	    phantom.exit();
	    return;
	}

	// TODO support globs, e.g. test/*.js
	// https://github.com/ariya/phantomjs/wiki/API-Reference-FileSystem
	// https://github.com/ariya/phantomjs/blob/master/examples/echoToFile.js

	for(var i=1; i<args.length; i++) {
    	var url = args[i];
		console.log("PhantomJS queuing: "+url+"...");
		SJTest4Phantom._pagesToLoad.push(url);
    }

	console.log("GO");
	SJTest4Phantom._doThemAll();

    SJTest.waitFor(SJTest4Phantom.isDoneTopLevel,
    	function() {
	    	var p = SJTest4Phantom.passed.length, f = SJTest4Phantom.failed.length, s = SJTest4Phantom.skipped.length;
	    	console.log("");
	    	console.log(SJTest.LOGTAG, "Passed: "+SJTest4Phantom.passed);
	    	console.log(SJTest.LOGTAG, "Failed: "+SJTest4Phantom.failed);
	    	console.log("");
	    	console.log(SJTest.LOGTAG, "Tests: "+(p+s+f)+"\tPassed: "+p+"\tSkipped: "+s+"\tFailed: "+f);
	    	if (f==0) {
	    		console.log(SJTest.LOGTAG, ":)");
	    		phantom.exit();
	    	} else {
	    		console.log(SJTest.LOGTAG, ":(");
	    		phantom.exit(1);
	    	}
    	});
};


SJTest4Phantom.isDoneTopLevel = function() {
	//console.log("isDoneTopLevel?");
	assert(SJTest.phantomjsTopLevel);
	// Are the pages done?
	for(var i=0; i<SJTest4Phantom._pagesInProcessing.length; i++) {
		var page = SJTest4Phantom._pagesInProcessing[i];
		var done = page.evaluate(function() {
			try {
				return SJTest.isDone();
			} catch(err) {
				if ( ! window._SJTestStart) window._SJTestStart = new Date().getTime();
				if (new Date().getTime() - window._SJTestStart < 10000) { // upto 10 seconds to handle setup messiness
					return false;
				}
				console.log("SJTest:fail	"+window.location+"	"+err);
				return true;
			}
		});
		//console.log(SJTest.phantomjsTopLevel+" "+page.url+" done "+done);
		if (done) {
			//console.log("Remove page!",page);
			SJTest.removeValue(page, SJTest4Phantom._pagesInProcessing);
			try {page.close();} catch(err) {}
		}
	}
	if (SJTest4Phantom._pagesToLoad.length > 0 || SJTest4Phantom._pagesInProcessing.length > 0) {
		//console.log("Q", SJTest4Phantom._pagesToLoad, "Pages", SJTest4Phantom._pagesInProcessing);
		return false;
	}
	//console.log("DoneTopLevel!");
	return true;
};

/**
 * Scripts and tests to load & run before we're done.
 */
SJTest4Phantom._pagesToLoad = [];
SJTest4Phantom._pagesInProcessing = [];


if ( ! SJTest.phantomjsTopLevel) {
	// pause momentarily to allow SJTest.on to maybe be set manually
	SJTestUtils.onLoad(function() {
		setTimeout(SJTest.display, 1);
	});
} else {
	SJTest4Phantom.goPhantom();
}
