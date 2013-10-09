/**
 * SJTest
 * @author Daniel Winterstein (http://winterstein.me.uk)
 * 
 * Requires: nothing!
 * 
 * Will use if present:
 * 
 * jQuery (or zepto)
 * Bootstrap 
 * Winterwell's assert.js
 * 
 * 
 * Will create if absent:
 * 
 * assert = SJTest.assert
 * assertArgs = SJTest.assertArgs
 * match = SJTest.match
 * isa = SJTest.isa
 * 
 * Usage:
 *  
 *  - In the browser, must be switched on with SJTest.on = true; Or by adding SJTest=on to the url.
 *  - In PhantomJS: Run phantomjs SJTest.js MyTest1.html MyTest2.html
 */
//(function(){
//	if (window.SJTest) return;	

	
	//	*********************
	// 	****    ATest    ****
	//	*********************
	
	/**
	 * 
	 * @param testName
	 * @param testFn
	 *            This should throw something to fail. Or you can use assert();
	 */
	function ATest(testName, testFn) {
		this.name = testName;
		this.fn = testFn;
		this._status = 'queue';
		this.stack = null;
		/**
		 * If a passing test returns a value (e.g. some useful extra info) --
		 * then store it here.
		 */
		this.details = null;
		this.error = false;
		this._id = ++ATest._idCnt;
	}
	ATest._idCnt = 0;
	
	Object.defineProperty(ATest.prototype, "status", {
    	get: function() {return this._status;},
    	set: function(s) {
    		this._status = s;
    		console.log(SJTest.LOGTAG+':'+this.status, this.name, this.details || this.stack || '');
    	}
	});
	/**
	 * @param waitFor
	 *            {?function} see SJTest.runTest()
	 * @param timeout
	 *            {?number} milliseonds Defaults to 5,000
	 */
	ATest.prototype.run = function(waitForThis, timeout) {
		var old_re = window.reportError;
		try {				
			// Winterwell's assert() will normally swallow errors (outputting to
			// log) -- But we want them thrown
			window.reportError = function(err){throw err;};			
			this.status = 'running...';
			console.log(SJTest.LOGTAG, this.name, this.status);
			// Run test!
			this.details = this.fn();
			// wait for async test?
			if ( ! waitForThis) {
				this.status = 'pass';
				return;
			}
			
			// waitFor?			
			var atest = this;
			var testDoneFn = function(yes) {
				console.log("ATest.this", atest);
				atest.status = 'pass';
	//			SJTest.passed.push(atest);
				if (yes !== true) atest.details = yes;
				assert(match(SJTest._displayTest, Function));
				if (SJTest._displayTable) SJTest._displayTest(atest); 
			}; 					
			
			var timeoutFn = function() {
				console.log("TIMEOUT ATest.this", atest);				
				atest.error = new Error("Timeout");
				atest.status = 'fail';
				//SJTest.failed.push(atest);
				assert(match(SJTest._displayTest, Function));
				if (SJTest._displayTable) SJTest._displayTest(atest);
			};
			
			SJTest.waitFor(waitForThis, testDoneFn, 
				timeout || 5000, timeoutFn);
		} catch(error) {
			this.error = error;
			if (error && error.stack) this.stack = error.stack;
			this.status = 'fail';			
		} finally {
			window.reportError = old_re;
		}
	};
	
	ATest.prototype.toString = function() {
		return "ATest["+this.name+" "+this.status+"]";
	};
		


	//	**********************
	// 	****    SJTest    ****
	//	**********************
	
	/**
	 * @class SJTest: Short for (So)DashTest? DanTest? Detest?
	 */
	
	var SJTest = {};

	/**
	 * If true, isDone() will return false.
	 * Use-case: To avoid PhantomJS stopping early before after-page-load tests are setup, 
	 * set true while loading & setting up tests, then you must set to false.
	 * @see SJTest.minTime
	 */
	SJTest.wait = false;
	
	
		/**
		 * If true (the default), use inline styles to improve the standard
		 * display. Set to false if you want to take charge of styling yourself.
		 */
	SJTest.styling = true;
	SJTest.LOGTAG = 'SJTest';
	
		/** Is testing on? Set to true/false to activate/deactivate SJTest */
	SJTest.on = false;
	
	/** true by default: Expose SJTest.assert() as global functions -- plus assertArgs(), isa(), and match()*/
	SJTest.expose = true;

	/**
	 * {Boolean} If off (the default), then SJTest will do nothing! Which lets you include tests in production code.
	 * Set by the url parameter SJTest=1, or it can be explicitly set in javascript.
	 * NB: Even when off, SJTest will still define some functions, e.g. assertArgs() & isa().
	 */
	SJTest.on = (""+window.location).match(/SJTest=(1|true|on)/)? true : false;
	console.log("location", ""+window.location+" on? "+SJTest.on);
	
	
		// Focus on certain tests?
	SJTest.skip = [];
	SJTest.only = [];
	
	SJTest.tests = [];

	/**
	 * {Array<(ATest|String)>} ATest in live usage. Strings (via console) in
	 * PhantomJS runner
	 */
	//SJTest.passed = [];
	/** {Array<(ATest|String)>} */
	//SJTest.failed = [];
	/** {Array<(ATest|String)>} */
	//SJTest.skipped = [];
	
	/**
	 * @param testSet
	 *            {object} A set of test functions to run, e.g. { name:
	 *            "MySimpleTests" MyTest1: function() { assert( 1+1 == 2); }
	 *            MyTest2: function() { assert(match("aa", /[abc]+/)); } }
	 * 
	 */
	SJTest.run = function(testSet) {
		console.log("SJTest.run");
		assert(typeof testSet === 'object', testSet);
		var setName = testSet.name || false;
		for(var tName in testSet) {
			if (tName=='name') continue;
			var tFn = testSet[tName];
			var fullName = setName? setName+"."+tName : tName;
			SJTest.runTest(fullName, tFn);
		}
	}; // run
	
	/**
	 * {Number} milliseconds (default: 100). isDone() will return false for at least this long.
	 * Use-case: To avoid PhantomJS stopping early before after-page-load tests are setup.
	 * @see SJTest.wait
	 */
	SJTest.minTime = 100;
	SJTest._started = new Date().getTime();
	
	/**
	 * @returns {Boolean} true if all tests are run, and minTime has expired
	 */
	SJTest.isDone = function() {
		console.log("isDone?");
		assert( ! SJTest.phantomjsTopLevel);
		if (SJTest.wait) return false;		
		if (new Date().getTime() < SJTest._started + SJTest.minTime) {
			console.log("Wait!");
			return false;
		}
		// Any running tests?
		for(var i=0; i<SJTest.tests.length; i++) {
			var test = SJTest.tests[i];
			if (test.status==='running...') return false;
		}
		console.log("isDone! ", SJTest.tests.length);
		return true;
	};
		
	/**
	 * @param testName
	 *            {!string}
	 * @param testFn
	 *            {!function}
	 * @param waitFor
	 *            {?function} A check for test-success which will be run
	 *            periodically. Returns true when done (or a String, which
	 *            will be reported as the test-details). Throw an error if
	 *            the test fails.
	 * @param timeout
	 *            {?number} max milliseconds to allow. Default to 5000 (5
	 *            seconds)
	 */
	SJTest.runTest = function(testName, testFn, waitForThis, timeout) {
		console.log("SJTest.runTest", testName);
		if ( ! SJTest.on) {
			console.log("SJTest.runTest"+testName+" NOT!");
			return;		
		}
		var dtest = false;
		if (testFn) {
			dtest = new ATest(testName, testFn);
		} else {
			// look for a test by name
			for(var i=0; i<SJTest.tests.length; i++) {
				var test = SJTest.tests[i];
				if (test.name === testName) {
					dtest = test;
					break;
				}
			}
			if ( ! dtest) {
				// Fail -- bad name
				dtest = new ATest(testName, function(){throw "Could not find test: "+testName;});	
			}
		}

		var skip = false;
		if (testFn) { // don't skip "manual" run-by-name calls
			// Skip if name begins //
			if (testName.indexOf('//') != -1) {
				skip = true;
			}
			if (SJTest.skip) {
				if (SJTest.skip.indexOf(testName)!=-1) {
					skip = true;
				}
			}
			if (SJTest.only) {
				for(var i=0; i<SJTest.only.length; i++) {
					
				}			
			}
		}
			
		SJTest.tests.push(dtest);
		
		SJTest.current = dtest;
		// run!
		if (!skip) {
			// TODO show running... if (SJTest._displayTable)
			// SJTest._displayTest(dtest);
			dtest.run(waitForThis, timeout);
		} else {
			dtest.status = 'skip';
		}
		// Result
		if (dtest.status=='pass') {
	//		SJTest.passed.push(dtest);
		} else {
	//		SJTest.failed.push(dtest);
		}
		// display now?
		if (SJTest._displayTable) SJTest._displayTest(dtest);
		SJTest.current = null;				
	}; // runTestASync()
	
		
	/**
	 * 
	 */
	SJTest.display = function() {
			if ( ! SJTest.on) {
				console.log(SJTest.LOGTAG, "Not on = no display");
				return;
			}	
			console.log(SJTest.LOGTAG, "Display!");
			var good=0,total=SJTest.tests.length;
			for(var i=0; i<SJTest.tests.length; i++) {
				var test = SJTest.tests[i];
				if (test.status==='pass') good++;
			}		
			SJTest._displayPanel = $("#SJTestDisplay"); // TODO factor jquery into polyfill
			if (SJTest._displayPanel.length==0) {
				//console.log(SJTest.LOGTAG, "Display Make it!");
				SJTest._displayPanel = $(
						"<div id='SJTestDisplay' "
						+(SJTest.styling? "style='position:fixed;top:0px;right:0px;width:70%;overflow:auto;max-height:100%;'" : '')
						+" class='SJTest panel panel-default'></div>");
				$('body').append(SJTest._displayPanel);
			} else {
				// clear out old
				SJTest._displayPanel.html("");
			}
			// Header
			SJTest._displayPanel.append("<div class='panel-heading'><h2 class='panel-title'>"
					+"Test Results: <span class='good'>"+good+"</span> / <span class='total'>"+total+"</span>"
					+"<button type='button' "+(SJTest.styling? "style='float:right;'":'')+" class='close' aria-hidden='true' onclick=\"$('#SJTestDisplay').remove();\">&times;</button>"
					+"</h2></div>");
			
			SJTest._displayTable = $("<table class='table table-bordered'></table>");
			SJTest._displayTable.append("<tr><th></th><th>Name</th><th>Result</th><th>Details</th><th>Stack</th></tr>");
			SJTest._displayPanel.append(SJTest._displayTable);
			for(var i=0; i<SJTest.tests.length; i++) {
				var test = SJTest.tests[i];
				SJTest._displayTest(test);				
			}		
		}; // display()
		
	/**
	 * Add a row to the display table
	 * 
	 * @param test {ATest}
	 */
	SJTest._displayTest = function(test) {
		assertArgs(test, ATest);
		// Name includes a repeat button
		var trid = "tr_SJTest_"+test._id;
		var tr = $('#'+trid);
		if ( ! tr.length) {
			tr = $("<tr id='"+trid+"'></tr>");
			SJTest._displayTable.append(tr);
			//console.log('make it', trid);
		} //else console.log('got it',trid);
		if (SJTest.styling) {
			var col = test.status=='pass'? '#9f9' : test.status=='skip'? '#ccf' : test.status=='running...'? '#fff' : '#f99';			
			$(tr).css({border:'1px solid #333', 'background-color':col});
		}
				
		$(tr).html("<td><a href='#' onclick='SJTest.runTest(\""+test.name+"\"); return false;'><span class='glyphicon glyphicon-repeat'></span></a></td><td>"
				+test.name
				+"</td><td>"+test.status+"</td><td>"+(test.error || SJTestUtils.str(test.details) || '-')+"</td><td>"
				+(test.stack || '-')+"</td>");
				
		// update scores
		var good=0,total=SJTest.tests.length;
		for(var i=0; i<SJTest.tests.length; i++) {
			var test = SJTest.tests[i];
			if (test.status==='pass') good++;
		}		
		$("span.good", SJTest._displayPanel).text(good);
		$("span.total", SJTest._displayPanel).text(total);
	};
		
	/**
	 * An assert function.
	 * 
	 * @param betrue
	 *            If true, do nothing. If false, throw an Error
	 * @param msg
	 *            Message on error.
	 */
	SJTest.assert = function(betrue, msg) {
		if (betrue) return;
		// A nice string?
		console.error("assert", msg || betrue);
		var smsg = SJTestUtils.str(msg);
		throw new Error(smsg);
	};

	/**
	 * Call with alternating parameter, pattern pairs.
	 * E.g. assertArgs(myNumericParam, Number)
	 * @throws Error if an argument does not match
	 */
	SJTest.assertArgs = function() {		
		assert(arguments.length % 2 == 0, arguments);
		for(var i=0; i<arguments.length; i+=2) {
			var v = arguments[i];
			var m = arguments[i+1];
			if ( ! SJTest.match(v, m)) {
				SJTest.match(v, m); // repeat for breakpoint based debugging
				console.error("Bad arguments", arguments);
				throw new Error("argument "+((i/2)+1)+") "+v+" != "+m);
			}
		}
	};
	
	/**
	 * Convenience for assert(match(value, matcher), value+" !~ "+matcher);
	 * Because it's a common use case.
	 */
	SJTest.assertMatch = function(value, matcher) {
		assert(match(value, matcher), value+" !~ "+matcher);
	};
	
	/**
	 * Like instanceof, but more reliable.
	 * 
	 * @param obj
	 *            Can be null/undefined (returns false)
	 * @param klass
	 *            e.g. Number
	 */
	SJTest.isa = function(obj, klass) {
		if (obj == klass) return true;
		if (obj instanceof klass) return true;
		assert(klass.constructor);		
		for(var i=0; i<10; i++) { // limit the recursion for safety
			if (obj === null || obj === undefined) return false;
			if ( ! obj.constructor) return false;
			if (obj.constructor == klass) return true;
			obj = obj.prototype;
		}
		return false;
	};

	
	/** Flexible matching test
	* @param value 
	* @param matcher Can be another value.
		Or a Class.
		Or a JSDoc-style class spec such as "?Number" or "Number|Function".
		Or a regex (for matching against strings).
		Or true/false (which match based on ifs semantics, e.g. '' matches false).
		Or an object (which does partial matching, allowing value to have extra properties).
	*/
	SJTest.match = function(value, matcher) {
		// simple
		if (value == matcher) return true;
		var sValue = ""+value;
		if (typeof matcher==='string') {
			// JSDoc type? e.g. ?Number or TODO String|Number
			if (matcher[0] === '?' && (value===null || value===undefined)) {
				return true;
			}
			// Get the class function
			var ms = matcher.split("|");
			for(var mi=0; mi<ms.length; mi++) {
				var m = ms[mi].match(/^\??(\w+?)!?$/);
				if ( ! m) break;
				try {
					var fn = new Function("return "+m);
					var klass = fn();
					if (SJTest.isa(value, klass)) {
						return true;
					} else {
						return false;
					}				
				} catch(err) {
					// oh well??
				}				
			}
			return false;
		}
		// lenient true/false
		if( ! matcher && ! value) return true;
		if (matcher===true && value) return true;
		// RegExp?
		if (matcher instanceof RegExp) {
			try {
			// var re = new RegExp("^"+matcher+"$"); // whole string match
				var matched = matcher.test(sValue);
				if (matched) return true;
			} catch(ohwell) {}
		}

		var lazyMatcher = null;
		if (matcher===Number) {
			if ( ! value && value !== 0) return false;
		}
		if (typeof matcher==='function') {
			// Class instanceof test
			if (matcher.constructor /*
									 * fn + constructor => this is a class
									 * object, so _could_ be a prototype
									 */) {
				if (SJTest.isa(value, matcher)) {
					return true;
				} else {
					return false;
				}
			} else {
				// matcher is a function -- lazy value?
				try {
					lazyMatcher = matcher();
					if (value==lazyMatcher) return true;
				} catch(ohwell) {}
			}
		}
		// Lazy value?
		if (typeof value==='function') {
			try {
				var hardValue = value();
				if (hardValue==matcher) return true;
				// Both lazy?
				if (lazyMatcher && hardValue==lazyMatcher) return true;
			} catch(ohwell) {}
		}
		
		// partial object match? e.g. {a:1} matches {a:1, b:2}
		if (typeof matcher==='object' && typeof value==='object') {
			for(var p in matcher) {
				var mv = matcher[p];
				var vv = value[p];
				if (mv != vv) {
					return false; 
				}
			}
			return true;
		}
		
		return false;
	};
	
	if ( ! window.match) window.match = SJTest.match;
	
	SJTest._scriptsInProcessing = [];
	
	SJTest.runScript = function(url, after) {
			if ( ! SJTest.on) return;
			console.log('runScript', url);
			SJTest._scriptsInProcessing.push(url);
			SJTestUtils.load(url, function() {
				console.log('runScript Done', url);
				SJTest._scriptsInProcessing.removeValue(url);
				if (after) after(); 
			}); // TODO .fail()
	// function() {
	// //if (SJTest.on) SJTest.runq();
	// if (after) after();
	// });
		};
		
	

		/**
		 * Waitfor, adapted from http://blog.jeffscudder.com/2012/07/waitfor-javascript.html
	@param condition {function} return true when ready. Errors are ignored.
	@param callback {function} Called once condition is true.
	@param timeout {?Number} Max time in milliseconds. If unset: wait indefinitely.
	@param onTimeout {?function} Called if timeout occurs.
	 * 
	 */
	SJTest.waitFor = function(condition, callback, timeout, onTimeout) {
		SJTest.assertArgs(condition, Function, callback, Function); //, timeout, "?Number", onTimeout, "?Function");
		SJTest.waitFor.waitingFor.push([condition, callback, timeout? new Date().getTime()+timeout : false, onTimeout]);
		SJTest.waitFor.check();
	};

	SJTest.waitFor.waitingFor = [];
	/**
	 * {Number} Check every n milliseconds. Default: 50
	 */
	SJTest.waitFor.period = 50;
	
	SJTest.waitFor.check = function() {
		var stillWaitingFor = [];
		for (var i = 0; i < SJTest.waitFor.waitingFor.length; i++) {
			var row = SJTest.waitFor.waitingFor[i];
			var condMet = false;
			try {
				condMet = row[0]();
			} catch (e) {}
			if (condMet) {
				row[1](condMet);
				continue;
			}
			if (row[2] && new Date().getTime() > row[2]) {
				// time out!
				console.log("waitFor timeout "+row[0]);
				if (row[3]) row[3]();				
				continue;
			}
			stillWaitingFor.push(SJTest.waitFor.waitingFor[i]);
		}

		SJTest.waitFor.waitingFor = stillWaitingFor;
		if (stillWaitingFor.length > 0) {
			//console.log("still waiting: ",stillWaitingFor);
			setTimeout(SJTest.waitFor.check, SJTest.waitFor.period);
		}
	};
	
	/**
	 * TODO How many tests should we see? If less than this, then not done
	 */
	SJTest.expectTests = function(n, timeout) {
		SJText._expectTests = n;
		SJTest.runTest("expectTests", 
				function(){}, 
				function(){return SJTest.tests.length >= n;}, timeout);
	};
	
	
	//	***************************
	//	****    SJTestUtils    ****
	//	***************************
	
	/**
	 * Singleton for utility functions.
	 */
	var SJTestUtils = {
		_initFlag: false
	};
	
	/** late-run to allow other polyfillers first shot */
	SJTestUtils.init = function() {
		if (SJTestUtils._initFlag) return;
		SJTestUtils._initFlag = true;
		// Array utils
		if ( ! Array.prototype.removeValue) {
			Array.prototype.removeValue = function(value) {
				var index = this.indexOf(value);
				if(index != -1) {
					Array.prototype.splice.call(this, index, true);
				}
				return this;
			};
		}
		
		// No JQuery!
		if (window.$ === undefined) {
			// TODO html() append() and dummy css() or other functions
		}
		
		// console
		if ( ! window.console) {
			// WTF? IE6? Oh well -- may as well play safe
			window.console = {};
			window.console.log = function(){};
		}
		
				
		/**
		 * url {string}, callback {function}
		 */
		if (window.$ && $.getScript) {
			// jQuery :)
			SJTestUtils.load = $.getScript;		
		} else {	
			SJTestUtils.load = function(url, callback) {
				console.log("loading...", url);
				var oHead = document.getElementsByTagName('head')[0];
				var oScript = document.createElement('script');
				oScript.type = 'text/javascript';
				oScript.src = url;
				oScript.onload = callback;
				oHead.appendChild(oScript);
			};
		} // load()
		
		/**
		 * @param fn {function} Run once the document is loaded.
		 */
		SJTestUtils.onLoad = window.$;
		if ( ! SJTestUtils.onLoad) {
			SJTestUtils.onLoad = function(fn) {
				setTimeout(fn,10); //hack: use a delay to avoid messing with window.onload behaviour
			};
		}

		if (window.printer && printer.str) {
			SJTestUtils.str = printer.str;
		} else {
			SJTestUtils.str = function(obj) {
				try {
					var msg = JSON.stringify(obj);
					return msg;
				} catch(circularRefError) {
					if (obj instanceof Array) {
						var safe = [];
						for(var i=0; i<obj.length; i++) {
							safe[i] = SJTestUtils.str(obj[i]);
						}
						return JSON.stringify(safe);
					}
					// safety first
					var safe = {};
					for(var p in obj) {
						var v = obj[p];
						if (typeof(v) == 'function') continue;
						else safe[p] = ""+v;
					}
					return JSON.stringify(safe);
				}				
			};
		}	// str()
		
		
		// Make SJTest functions global??
		if (SJTest.expose) {
			// assert
			if ( ! window.assert) {
				window.assert = SJTest.assert;
			}
			if ( ! window.match) {
				window.match = SJTest.match;
			}
			// attest = assert (useful if assert is already occupied) HM Bit confusing though to have 2 equiv functions
			//if ( ! window.attest) {
			//	window.attest = SJTest.assert;
			//}
			if ( ! window.assertArgs) {
				window.assertArgs = SJTest.assertArgs;
			}
			if ( ! window.assertMatch) {
				window.assertMatch = SJTest.assertMatch;
			}
			if ( ! window.isa) {
				window.isa = SJTest.isa;
			}		
			if ( ! window.str) {
				window.str = SJTestUtils.str;
			}		
		}
	}; // ./ init
	
	
	// / END FUNCTIONS *** START SCRIPT ///
	
	// PhantomJS?
	if (navigator && navigator.userAgent 
			&& navigator.userAgent.toLowerCase().indexOf("phantomjs")!=-1) {
		// In Phantom -- but top level or inside a page?
		if ( ! window.location.hostname && 
				( ! window.location.pathname || window.location.pathname.length < 2 || window.location.pathname.substr(-'SJTest.js'.length)==='SJTest.js')) 
		{
			SJTest.phantomjsTopLevel = true;
		} else {
			// disable display
			SJTest.display = function(){};
			SJTest._displayTest = function(){};
		}
	}
	
	// Run the polyfill
	SJTestUtils.init();
	
	
	
	
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
		page.onConsoleMessage = function(m){
			console.log(m); // ?? filter by LOGTAG
			var mcode = m.substr(0, 'SJTest:pass'.length);
			if (mcode==='SJTest:pass') {
				SJTest4Phantom.passed.push(m);
			} else if (mcode==='SJTest:fail') {
				SJTest4Phantom.failed.push(m);
			} else if (mcode==='SJTest:skip') {
				SJTest4Phantom.skipped.push(m);
			}
		};
	
		 // Switch SJTest on!
		if (url.indexOf('?')!=-1) url += "&SJTest=1"; else url += "?SJTest=1";
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
			console.log('SJTest version 0.1 by Daniel Winterstein');
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
		    	if (f==0) console.log(SJTest.LOGTAG, ":)");
		    	else console.log(SJTest.LOGTAG, ":(");
		    	phantom.exit();
	    	});	
	};
	

	SJTest4Phantom.isDoneTopLevel = function() {
		console.log("isDoneTopLevel?");
		assert(SJTest.phantomjsTopLevel);
		// Are the pages done?
		for(var i=0; i<SJTest4Phantom._pagesInProcessing.length; i++) {
			var page = SJTest4Phantom._pagesInProcessing[i];
			var done = page.evaluate(function() {return SJTest.isDone();});
			console.log(SJTest.phantomjsTopLevel+" "+page.url+" done "+done);
			if (done) {
				console.log("Remove page!",page);
				SJTest4Phantom._pagesInProcessing.removeValue(page);
				try {page.close();} catch(err) {}
			}			
		}
		if (SJTest4Phantom._pagesToLoad.length > 0 || SJTest4Phantom._pagesInProcessing.length > 0) {
			console.log("Q", SJTest4Phantom._pagesToLoad, "Pages", SJTest4Phantom._pagesInProcessing);
			return false;
		}
		console.log("DoneTopLevel!");
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

//}()); // end !SJTest wrapper function
