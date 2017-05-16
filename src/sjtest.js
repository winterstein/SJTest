/**
 * SJTest - version: see SJTest.version property
 * @author Daniel Winterstein (http://winterstein.me.uk)
 *
 * Requires: nothing!
 *
 * Will use if present:
 *
 *  - jQuery (or zepto)
 *  - Bootstrap
 *
 * Will create if absent:
 *
 *  - assert() = SJTest.assert
 *  - match() = SJTest.match (a flexible matcher for easier testing)
 *  - assMatch() = SJTest.assMatch = assert(match())
 *  - isa() = SJTest.isa (like instanceof, but more robust)
 *  - waitFor() = SJTest.waitFor (polling based, handy for async tests, and elsewhere)
 *
 * Usage:
 *
 *  - In the browser, must be switched on with SJTest.on = true; Or by adding SJTest=on to the url.
 *  - In PhantomJS: Run phantomjs runner.js MyTest1.html MyTest2.html
 *  - In Mocha: use assertMatch and match for joyful testing

 * Documentation: http://winterstein.github.io/SJTest/
 * Or see the code...
 */

// In mocha/node?
if (typeof window === 'undefined') window = global;

//	*********************
// 	****    ATest    ****
//	*********************

/**
 * @class ATest
 * @param testName
 * @param testFn
 *            This should throw something to fail. Or you can use assert();
 */
function ATest(testName, testFn) {
	assertMatch(testName, String, testFn, Function);
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

// NB: Object.defineProperty doesn't work on IE7
/**
 * @returns {string} queue|skip|running...|waiting|pass|fail
 */
ATest.prototype.getStatus = function() {return this._status;};
/**
 * @param s {string} Must be one of: queue|skip|running...|waiting|pass|fail <br>
 * You can use setStatus('waiting') within a test function to defer pass/fail. <br>
 * You can then use setStatus('fail') within a test function to explicitly fail the test.
 */
ATest.prototype.setStatus	= function(s) {
	assert('|queue|skip|running...|waiting|pass|fail|'.indexOf(s) != -1, s);
	this._status = s;
	// Logging status provides a hook for the PhantomJS runner to watch
	console.log(SJTest.LOGTAG+':'+this._status, this.name, this.details || this.stack || '');
};
/**
 * @param waitForThis
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
		this.setStatus('running...');
		console.log(SJTest.LOGTAG, this.name, this.getStatus());

		// Run the Test!
		// NB: Pass in the ATest for reflection, though almost all tests will ignore it.
		// The ATest is one way of doing async tests: E.g.
		// function MyTest(test) {test.setStatus('waiting');
		//   $.get('myurl').done(function(){test.setStatus('pass');});
		// }
		this.details = this.fn(this);

		// wait for async test?
		var atest = this;
		if ( ! waitForThis) {
			if (this._status === 'waiting') {
				waitForThis = function(){return atest._status==='pass' || atest._status==='fail';};
			} else {
				// All done -- no need to wait
				this.setStatus('pass');
				return;
			}
		}

		// waitFor?
		var testDoneFn = function(yes) {
			// Passed (unless it failed itself)
			if (atest._status !== 'fail') atest.setStatus('pass');
			if (yes !== true) atest.details = yes;
			assert(match(SJTest._displayTest, Function));
			if (SJTest._displayTable) SJTest._displayTest(atest);
		};

		var timeoutFn = function() {
			//console.log("TIMEOUT ATest.this", atest);
			atest.error = new Error("Timeout");
			atest.setStatus('fail');
			assert(match(SJTest._displayTest, Function));
			if (SJTest._displayTable) SJTest._displayTest(atest);
		};

		SJTest.waitFor(waitForThis, testDoneFn,
			timeout || 10000, timeoutFn);
	} catch(error) {
		this.error = error;
		if (error && error.stack) this.stack = error.stack;
		this.setStatus('fail');
	} finally {
		window.reportError = old_re;
	}
};

ATest.prototype.toString = function() {
	return "ATest["+this.name+" "+this.getStatus()+"]";
};



//	**********************
// 	****    SJTest    ****
//	**********************

/**
 * Simple Javascript Testing (for browser-based code).
 *
 * Extend an existing object if present, to allow the user to put in settings.
 * The default values below use ||s to let any user settings take precedence.
 *
 * @class SJTest
 * @static
 */
var SJTest = SJTest || {};

/** What version of SJTest is this? */
SJTest.version = '0.4';

/**
 * If true, isDone() will return false.
 * Use-case: To avoid PhantomJS stopping early before after-page-load tests are setup,
 * set true while loading & setting up tests, then you must set to false.
 * @see SJTest.minTime
 */
SJTest.wait = SJTest.wait || false;

/**
 * If true (the default), use inline styles to improve the standard
 * display. Set to false if you want to take charge of styling yourself.
 */
if (SJTest.styling===undefined) SJTest.styling = true;
/**
 * Used with all console.log output, for easy filtering.
 */
SJTest.LOGTAG = 'SJTest';

/**
 * {Boolean} If off (the default), then SJTest will do nothing! Which lets you include tests in production code.
 * Set by the url parameter SJTest=(on|a url), or it can be explicitly set in javascript.
 * A javascript setting takes precedence over a url parameter.
 * <p>
 * NB: Even when off, SJTest will still define some functions, e.g. assertMatch() & isa().
 */
if (SJTest.on===undefined) {
	var locn = ""+window.location;
	var queryParser = /[?&]SJTest=([^&]+)?/;
	var m = locn.match(queryParser);
	if (m && m[1] && m[1]!=='false' && m[1]!=='off') {
		SJTest.on = true;
	} else {
		SJTest.on = false;
	}
}

/** true by default: Expose SJTest.assert() as a global function
 *  -- plus assertMatch(), isa(), waitFor(), match()
 */
if (SJTest.expose===undefined) SJTest.expose = true;

/**
 * {Number} milliseconds (default: 100). isDone() will return false for at least this long.
 * Use-case: To avoid PhantomJS stopping early before after-page-load tests are setup.
 * @see SJTest.wait
 */
if (SJTest.minTime===undefined) SJTest.minTime = 100;

// Focus on certain tests?
if (SJTest.skip===undefined) SJTest.skip = [];
if (SJTest.only===undefined) SJTest.only = [];

SJTest.tests = [];

/**
 * @param testSet
 *            {object} A set of test functions to run, e.g. { name:
 *            "MySimpleTests" MyTest1: function() { assert( 1+1 == 2); }
 *            MyTest2: function() { assert(match("aa", /[abc]+/)); } }
 *
 */
SJTest.run = function(testSet) {
	if ( ! SJTest.on) {
		console.log(SJTest.LOGTAG, "NO run", testSet);
		return;
	}
	console.log(SJTest.LOGTAG, "run", testSet);
	assert(typeof testSet === 'object', testSet);
	var setName = testSet.name || false;
	for(var tName in testSet) {
		if (tName=='name') continue;
		var tFn = testSet[tName];
		var fullName = setName? setName+"."+tName : tName;
		SJTest.runTest(fullName, tFn);
	}
}; // run

/** @ignore */
/* When did SJTest start? Used to determine minTime timeout. */
SJTest._started = new Date().getTime();

/**
 * @returns {Boolean} true if all tests are run, and minTime has expired
 */
SJTest.isDone = function() {
	//console.log("isDone?");
	assert( ! SJTest.phantomjsTopLevel);
	if (SJTest.wait) return false;
	if (new Date().getTime() < SJTest._started + SJTest.minTime) {
		//console.log("Wait!");
		return false;
	}
	// Any running tests?
	for(var i=0; i<SJTest.tests.length; i++) {
		var test = SJTest.tests[i];
		if (test.getStatus()!=='pass' && test.getStatus()!=='fail' && test.getStatus()!=='skip') {
			return false;
		}
	}
	//console.log("isDone! ", SJTest.tests.length);
	return true;
};

/**
 * @param testName
 *            {!String}
 * @param testFn
 *            {?Function} If null, look for a test by this name.
 * @param waitFor
 *            {?Function} A check for test-success which will be run
 *            periodically. Returns true when done (or a String, which
 *            will be reported as the test-details). Throw an error if
 *            the test fails.
 * @param timeout
 *            {?Number} max milliseconds to allow. Default to 10000 (10 seconds)
 */
SJTest.runTest = function(testName, testFn, waitForThis, timeout) {
	if ( ! SJTest.on) {
		console.log(SJTest.LOGTAG, "NO runTest", testName);
		return;
	}
	assertMatch(testName, String, testFn, "?Function", waitForThis, "?Function", timeout, "?Number");
	console.log(SJTest.LOGTAG, "runTest", testName);
	var dtest = false;
	if (testFn) {
		dtest = new ATest(testName, testFn);
		dtest.waitForThis = waitForThis;
		dtest.timeout = timeout;
	} else {
		// look for a test by name
		for(var i=0; i<SJTest.tests.length; i++) {
			var test = SJTest.tests[i];
			if (test.name === testName) {
				dtest = test;
				waitForThis = dtest.waitForThis;
				timeout = dtest.timeout;
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
	// run!
	if (!skip) {
		dtest.run(waitForThis, timeout);
	} else {
		dtest.setStatus('skip');
	}
	// Result! display now?
	if (SJTest._displayTable) SJTest._displayTest(dtest);
}; // runTestASync()


/**
 * Called automatically. Adds a table of test results to the page. The table floats above the normal page, and can be closed.
 */
SJTest.display = function() {
	if ( ! SJTest.on) {
		//console.log(SJTest.LOGTAG, "Not on = no display");
		return;
	}
	//console.log(SJTest.LOGTAG, "Display!");
	var good=0,total=SJTest.tests.length;
	for(var i=0; i<SJTest.tests.length; i++) {
		var test = SJTest.tests[i];
		if (test.getStatus()==='pass') good++;
	}
	/** @ignore */
	/* The display DOM element */
	SJTest._displayPanel = SJTestUtils.$getById("SJTestDisplay");
	if ( ! SJTest._displayPanel || ! SJTest._displayPanel.length) {
		//console.log(SJTest.LOGTAG, "Display Make it!");
		SJTest._displayPanel = SJTestUtils.$create(
				"<div id='SJTestDisplay' "
				+(SJTest.styling? "style='z-index:100000;background:white;border:2px solid black;position:fixed;top:0px;right:0px;width:70%;overflow:auto;max-height:100%;'" : '')
				+" class='SJTest panel panel-default'></div>");
		SJTestUtils.$(document.body).append(SJTest._displayPanel);
	} else {
		// clear out old
		SJTest._displayPanel.html("");
	}
	// Header
	SJTest._displayPanel.append("<div class='panel-heading'><h2 class='panel-title'>"
			+"Test Results: <span id='_SJTestGood'>"+good+"</span> / <span id='_SJTestTotal'>"+total+"</span>"
			+"<button title='Close Tests' type='button' "+(SJTest.styling? "style='float:right;'":'')+" class='close' aria-hidden='true' onclick=\"$('#SJTestDisplay').remove();\">&times;</button>"
			+"</h2></div>");

	/** @ignore */
	/* DOM table fo results */
	SJTest._displayTable = SJTestUtils.$create("<table class='table table-bordered'></table>");
	SJTest._displayTable.append("<tr><th></th><th>Name</th><th>Result</th><th>Details / Stack</th></tr>");
	SJTest._displayPanel.append(SJTest._displayTable);
	for(var i=0; i<SJTest.tests.length; i++) {
		var test = SJTest.tests[i];
		SJTest._displayTest(test);
	}
}; // display()

/** @ignore */
/* Add a row to the display table
 *
 * @param test {ATest}
 */
SJTest._displayTest = function(test) {
	assertMatch(test, ATest);
	// Name includes a repeat button
	var trid = "tr_SJTest_"+test._id;
	var tr = SJTestUtils.$getById(trid);
	if (!tr || ! tr.length) {
		tr = SJTestUtils.$create("<tr id='"+trid+"'></tr>");
		assert(tr);
		SJTest._displayTable.append(tr);
		//console.log('make it', trid);
	} //else console.log('got it',trid);
	if (SJTest.styling) {
		var col = test.getStatus()==='pass'? '#9f9' : test.getStatus()==='skip'? '#ccf' : test.getStatus()==='running...'||test.getStatus()==='waiting'? '#ff9' : '#f99';
		tr.css({border:'1px solid #333', 'background-color':col});
	}

	tr.html("<td><a href='#' title='Re-run this test' onclick='SJTest.runTest(\""+test.name+"\"); return false;'>&#8635;</a></td><td>"
			+test.name
			+"</td><td>"+test.getStatus()+"</td><td>"+(test.error || SJTestUtils.str(test.details) || '-')
			+" "+(test.stack || '')+"</td>");

	// update scores
	var good=0,total=SJTest.tests.length;
	for(var i=0; i<SJTest.tests.length; i++) {
		var test = SJTest.tests[i];
		if (test.getStatus()==='pass') good++;
	}

	SJTestUtils.$getById('_SJTestGood').html(''+good);
	SJTestUtils.$getById('_SJTestTotal').html(''+total);
};

/**
 * An assert function.
 * Error handling can be overridden by replacing SJTest.assertFailed()
 * @param betrue
 *            If true (or any truthy value), do nothing. If falsy, console.error and throw an Error.
 *            HACK: As a special convenience, the empty jQuery result (ie a jquery select which find nothing) is considered to be false!
 *            For testing jQuery selections: Use e.g. $('#foo').length
 * @param msg
 *            Message on error. This can be an object (which will be logged to console as-is,
 *            and converted to a string for the error).
 * @returns betrue on success. This allows assert() to be used as a transparent wrapper.
 * E.g. you might write <code>var x = assert(mything.propertyWhichMustExist);</code>
 */
SJTest.assert = function(betrue, ...msg) {
	if (betrue) {
		if (betrue.jquery && betrue.length===0) {
			// empty jquery selection - treat as false
			if ( ! msg) msg = "empty jquery selection";
			SJTest.assertFailed(msg);
			return;
		}
		// success
		return betrue;
	}
	SJTest.assertFailed(msg || betrue);
};
/**
 * Handle assert() failures. Users can replace this with a custom handler.
 */
SJTest.assertFailed = function(msg) {
	// we usually pass in an array from ...msg
	if (msg.length===1) msg = msg[0];
	console.error("assert", msg);
	// A nice string?
	var smsg = SJTestUtils.str(msg);
	throw new Error("assert-failed: "+smsg);
};


/**
 * Convenience for assert(match(value, matcher), value+" !~ "+matcher);
 * Because it's a common use case.
 * Arguments are alternating [airs of value, matcher (as many pairs as you like).
 * E.g. assertMatch(myNumericValue, Number); or assertMatch(myNumericValue, Number, specificStringValue, "foo|bar");
 */
SJTest.assertMatch = function() {
	SJTest.assert(arguments.length % 2 == 0, arguments);
	for(var i=0; i<arguments.length; i+=2) {
		var v = arguments[i];
		var m = arguments[i+1];
		SJTest.assert(SJTest.match(v, m), (arguments.length>2? ((i/2)+1)+') ':'')+ SJTestUtils.str(v) +" !~ "+m);
	}
};

/**
 * value, matcher
 * @param msg {?string}
 */
SJTest.assMatch = function(value, matcher, msg) {
	SJTest.assert(SJTest.match(value, matcher), msg || SJTestUtils.str(value) + " !~ " + SJTestUtils.str(matcher));	
};

/**
 * Like instanceof, but more robust.
 *
 * @param obj
 *            Can be null/undefined (returns false)
 * @param klass
 *            e.g. Number
 * @returns {Boolean} true if obj is an example of klass.
 */
SJTest.isa = function(obj, klass) {
	if (obj === klass) return true; // This can be too lenient, e.g. Number is not a Number. But it's generally correct for a prototype language.
	if (obj instanceof klass) return true;
	for(var i=0; i<10; i++) { // limit the recursion 10-deep for safety
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
	Or a JSDoc-style class spec such as "?Number" or "Number|Function" or "String[]".
	Or a regex (for matching against strings).
	Or true/false (which match based on ifs semantics, e.g. '' matches false).
	Or an object (which does partial matching, allowing value to have extra properties).
 @returns true if value matches, false otherwise
*/
SJTest.match = function(value, matcher) {
	// TODO refactor to be cleaner & recursive
	// simple
	if (value == matcher) return true;
	var sValue = ""+value;
	if (typeof matcher==='string') {
		// JSDoc optional type? e.g. ?Number
		if (matcher[0] === '?' && (value===null || value===undefined)) {
			return true;
		}
		if (value===null || value===undefined) return false;
		// Get the class function(s)
		var ms = matcher.split("|");
		for(var mi=0; mi<ms.length; mi++) {
			var mArr = ms[mi].match(/^\??(\w+?\[?\]?)!?$/);
			if ( ! mArr) break;
			var m = mArr[1];
			if (sValue===m) return true;
			if (m==='Number'||m==='number') { // allow string to number conversion
				if (typeof value === 'number' && ! isNaN(value)) return true;
				var nv = parseFloat(value);
				if (nv || nv===0) return true;
				continue;
			}
			// array syntax?
			if (m.substr(m.length-2,m.length)==='[]') {
				if (value.length===undefined) return false;
				let arrayType = m.substr(0, m.length-2);
				for(let vi=0; vi<value.length; vi++) {
					if ( ! SJTest.match(value[vi], arrayType)) {
						return false;
					}
				}
				return true;
			}
			try {
				// eval the class-name
				var fn = new Function("return "+m);
				var klass = fn();
				if (SJTest.isa(value, klass)) {
					return true;
				}
			} catch(err) {
				// eval(m) failed to find a class
				// A non-global ES6 class?
				// Note: this is just for the string matcher. If the user put in a proper class object, we're fine.
				var v = value;
				while(true) {
					if (v.constructor && v.constructor.name === m) {
						return true;
					}
					v = Object.getPrototypeOf(v);
					if ( ! v) break;
				}
			} // ./try class test
		} // ./ for matcher-bit
		return false;
	} // string matcher

	// lenient true/false
	if(matcher===false && ! value) return true;
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
	if (matcher===Number) { // allow string to number conversion
		if (typeof value === 'number' && ! isNaN(value)) return true;
		var nv = parseFloat(value);
		return (nv || nv===0);
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

/** array utility: remove by value. @return array */
SJTest.removeValue = function(item, array) {
	var index = array.indexOf(item);
	if (index==-1) return array;
	array.splice(index, 1);
	return array;
};

/** @ignore */
/* Queue  */
SJTest._scriptsInProcessing = [];

/**
 * @param url {String} Can be absolute or relative to the page.
 * @param after {?Function} Optional callback to run after loading.
 */
SJTest.runScript = function(url, after) {
	if ( ! SJTest.on) return;
	console.log(SJTest.LOGTAG, 'runScript', url);
	SJTest._scriptsInProcessing.push(url);
	SJTestUtils.load(url, function() {
		//console.log('runScript Loaded And Done', url);
		SJTest.removeValue(url, SJTest._scriptsInProcessing);
		if (after) after();
	},
	/* fail function */ function(err) {
		SJTest.runTest("runScript", function() {
			console.error(SJTest.LOGTAG,url,err);
			throw "Could not load "+url+". See console for details.";
		});
	});
};



/**
 * Use with SJTest=PathToMyScript in the page url.
 * Call this to run a script (if there is one) specified by SJTest=path in the url parameters.
 * <p>
 * Note: This is restricted to relative urls for security. This may still have
 * security implications. If you call this, you allow a potentially malicious link
 * to run arbitrary scripts from the same domain in the page. So do not
 * use if an attacker could place a script onto the same domain, or abuse
 * one of yours.
 */
SJTest.runScriptFromUrl = function() {
	// Is there a script in the url?
	var locn = ""+window.location;
	var queryParser = /[?&]SJTest=([^&]+)?/;
	var m = locn.match(queryParser);
	if ( ! m) return;
	var script = m[1];
	if ( ! script) return;
	if ( ! SJTest.on) {
		 // Not on!
		console.log(SJTest.LOGTAG, "NOT on, so not running script "+script);
		return;
	}
	console.log(SJTest.LOGTAG, "runScriptFromUrl: "+script);
	// Security check: must be a relative url
	if (script.indexOf('//') != -1) {
		console.warn(SJTest.LOGTAG, "NOT running. For security, you cannot run cross-domain test scripts.");
		return;
	}
	SJTest.runScript(script);
};

/**
 * Waitfor, adapted from http://blog.jeffscudder.com/2012/07/waitfor-javascript.html
 * This does *not* block, but calls the callback when ready and any then/done/fail deferred functions.
 * <p>
 * Note: Why no blocking? Blocking is problematic given that normal javascript is single-threaded with switching.
 * Usually you're waiting on an ajax request. Blocking would deny the ajax handler a chance to run. So you would
 * block forever.
 *
@param condition {Function} return true when ready. Errors are ignored.
@param callback {?Function} Called once condition is true.
@param timeout {?Number} Max time in milliseconds. If unset: wait indefinitely.
@param onTimeout {?Function} Called if timeout occurs.

@returns A jQuery deferred object (IF jQuery is present), so you can do waitFor(X).then(Y). null if no jQuery.
 *
 */
SJTest.waitFor = function(condition, callback, timeout, onTimeout) {
	SJTest.assertMatch(condition, Function, callback, "?Function", timeout, "?Number", onTimeout, "?Function");
	var deferred = window.jQuery? new jQuery.Deferred() : null;
	SJTest.waitFor.waitingFor.push([condition, callback, timeout? new Date().getTime()+timeout : false, onTimeout, deferred]);
	SJTest.waitFor.check();
	return deferred;
};

SJTest.waitFor.waitingFor = [];
/**
 * {Number} Check every n milliseconds. Default: 50
 */
SJTest.waitFor.period = 50;

/**
 * Check all the things we're waiting on. Schedule another check a bit later if we're still waiting.
 */
SJTest.waitFor.check = function() {
	var stillWaitingFor = [];
	for (var i = 0; i < SJTest.waitFor.waitingFor.length; i++) {
		var row = SJTest.waitFor.waitingFor[i];
		var condMet = false;
		try {
			condMet = row[0]();
		} catch (e) {}
		if (condMet) {
			// Done! ...Callback
			if (row[1]) row[1](condMet);
			// ...Deferred
			if (row[4]) row[4].resolve();
			continue;
		}
		if (row[2] && new Date().getTime() > row[2]) {
			// time out!
			console.log("waitFor timeout "+row[0]);
			if (row[3]) row[3]();
			// deferred fail
			if (row[4]) row[4].reject();
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
 * How many tests should we see? If less than this, then the page's tests are not yet done.
 * Use-case: for async / delayed tests, to make sure they aren't skipped.
 *
 * This is itself a test (so you can see it pass/fail) -- but it is _not_ counted as one of the n.
 *
 * Note: Currently, this can only be called once per page.
 *
 * @param n {Number} How many tests does this page have?
 * (excludes the expectTests one which this call will make)
 * @param timeout {?Number} Milliseconds. Defaults to 10,000 (10 seconds)
 */
SJTest.expectTests = function(n, timeout) {
	if ( ! SJTest.on) return;
	assert( ! SJTest._expectTests, "Already expecting "+SJTest._expectTests+" "+n);
	// Store n for possible reflection
	/** @ignore */
	/* How many tests do we expect? */
	SJTest._expectTests = n;
	if ( ! timeout) timeout = 10000;
	SJTest.runTest("expectTests_"+n,
			function(){},
			function(){return SJTest.tests.length > n;}, timeout);
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
	// No JQuery!
	if (window.$ === undefined) {
		// TODO html() append() and dummy css() or other functions
	}

	// console
	if ( ! window.console) {
		// WTF? IE6? Oh well -- may as well play safe
		window.console = {};
		window.console.log = function(){};
		window.console.error = function(){};
	}


	/**
	 * url {string}, callback {function}, fail {?Function} Only supported with jQuery
	 */
	SJTestUtils.load = function(url, callback, onFail) {
		console.log(SJTest.LOGTAG, "loading...", url, callback);
		if (window.$ && $.getScript) {
			// Use jQuery if we can
			console.log(SJTest.LOGTAG, "load by jQuery...", url, callback);
			var gs = $.getScript(url, callback);
			if (onFail) gs.fail(onFail);
			return;
		}
		var oHead = document.getElementsByTagName('head')[0];
		var oScript = document.createElement('script');
		oScript.type = 'text/javascript';
		oScript.src = url;
		oScript.onload = callback;
		oHead.appendChild(oScript);
	};// load()

	/**
	 * @param fn {function} Run once the document is loaded.
	 */
	SJTestUtils.onLoad = window.$;
	if ( ! SJTestUtils.onLoad) {
		SJTestUtils.onLoad = function(fn) {
			setTimeout(fn,10); //hack: use a delay to avoid messing with window.onload behaviour
		};
	}

	/**
	 * str -- Robust stringify. Use Winterwell's printer.str() if available. Else a simple version.
	 */
	SJTestUtils.str = function(obj) {
		// Use printer.str if defined (test at runtime to avoid ordering or race conditions on loading)
		if (typeof(printer) !== 'undefined' && printer.str) {
			return printer.str(obj);
		}
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
	}; // str()

	/**
	 * A very light jQuery replacement, so there's no dependency. SJTest will use the proper jQuery (or zepto or whatever) if available!
	 */
	SJTestUtils.$ = function(thing) {
		if ( ! thing) return thing;
		if (window.$) return $(thing);
		var $thing = {"$el": thing};
		$thing.append = function(child) {
			assert(child);
			//console.log("append", thing, child);
			return SJTestUtils.$append(thing, child);
		};
		$thing.html = function(html) {
			if (html !== undefined) thing.innerHTML = html;
			return thing.innerHTML;
		};
		$thing.length = 1;
		$thing.css = function(){};
		return $thing;
	};

	SJTestUtils.$getById = function(id) {
		if (window.$) return $('#'+id);
		assert(id);
		return SJTestUtils.$(document.getElementById(id));
	};

	SJTestUtils.$create = function(html) {
		if (window.$) return $(html);
		assert(html);
		//console.log("$create", html);
		var el = document.createElement('div');
		el.innerHTML = html;
		var el2 = el.childNodes && el.childNodes[0]? el.childNodes[0] : el;
		assert(el2, el);
		return SJTestUtils.$(el2);
	};

	SJTestUtils.$append = function(element, child) {
		if (window.$) return $(element).append(child);
		assert(element);
		assert(child);
		if (typeof child === 'string') {
			child = SJTestUtils.$create(child);
			assert(child);
		}
		if (child.$el) child = child.$el;
		assert(child);
		console.log("$append", element, child);
		element.appendChild(child);
	};


	// Make SJTest functions global??
	if (SJTest.expose) {
		// But don't override anything
		if ( ! window.assert) {
			window.assert = SJTest.assert;
		}
		if ( ! window.match) {
			window.match = SJTest.match;
		}
		if ( ! window.waitFor) {
			window.waitFor = SJTest.waitFor;
		}
		if ( ! window.assertMatch) {
			window.assertMatch = SJTest.assertMatch;
		}
		if ( ! window.assMatch) {
			window.assMatch = SJTest.assMatch;
		}
		if ( ! window.isa) {
			window.isa = SJTest.isa;
		}
		if ( ! window.str) {
			window.str = SJTestUtils.str;
		}
	}

	// Run a script from a url request? No, it'd be a security hole :(
}; // ./ init


// / END FUNCTIONS *** START SCRIPT ///

// PhantomJS?
if (typeof(navigator)!=='undefined' && navigator.userAgent
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

if ( ! SJTest.phantomjsTopLevel) {
	// pause momentarily to allow SJTest.on to maybe be set manually
	SJTestUtils.onLoad(function() {
		setTimeout(SJTest.display, 1);
	});
} else {
	SJTest4Phantom.goPhantom();
}


// EXPORT
if (typeof(module)!=='undefined') {
	module.exports = SJTest;
}
export default SJTest;
export {assert, assMatch, assertMatch, SJTest};
