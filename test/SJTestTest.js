
var SJTestTest = {
	name:"SJTest",

	"match-type": function() {
		let foo = {'@type':'Foo', name:'bar'};
		let Foo = {'@type':'DataClass', type:'Foo'};
		let Fooby = {'@type':'DataClass', type:'Fooby'};
		SJTest.assert(SJTest.match(foo, 'Foo'));
		SJTest.assert( ! SJTest.match(foo, 'Fooby'));
		SJTest.assert(SJTest.match(foo, Foo));
		SJTest.assert( ! SJTest.match(foo, Fooby));
		SJTest.assert( ! SJTest.match(foo, "Number"));
	},

	"match-generic-array": function() {
		SJTest.assert(SJTest.match(["a"], "String[]"));
		SJTest.assert(SJTest.match([], "String[]"));
		SJTest.assert( ! SJTest.match([{a:1}], "String[]"));
	},

	"match-str": function() {
			SJTest.assert(SJTest.match("a", "a"));
			SJTest.assert(SJTest.match("a"+"b", "ab"));
			SJTest.assert( ! SJTest.match("ab", "abc"));
			SJTest.assert( ! SJTest.match("abc", "bc"));
		},

	"match-regexp": function() {
		SJTest.assert(SJTest.match("a", /a/));
		SJTest.assert(SJTest.match("a"+"b", /ab/));
		SJTest.assert(SJTest.match("abbc", /ab+/));
		SJTest.assert(SJTest.match("abbc", /^.b+.$/));
		SJTest.assert( ! SJTest.match("abbc", /^.b.$/));
	},

	"match-class": function() {
		SJTest.assert(SJTest.match(1, Number), 1);
		SJTest.assertMatch(0, "Number");
		SJTest.assert(SJTest.match("a", String), "a");
		SJTest.assert( ! SJTest.match(1, String), "- 1");
		SJTest.assert( ! SJTest.match("a", Number), "- a");
	},

	"match-ES6-class": function() {
		class Foo {

		}
		var foo = new Foo();
		SJTest.assert(SJTest.match(foo, Foo));
		SJTest.assert(SJTest.match(foo, "Foo"));
		SJTest.assert( ! SJTest.match(foo, "Number"));
	},

	"match-ES6-super-class-class-matcher": function() {
		class Foo {

		}
		class Bar extends Foo {

		}
		var foo = new Foo();
		var bar = new Bar();
		SJTest.assert(SJTest.match(foo, Foo));
		SJTest.assert(SJTest.match(foo, "Foo"));
		SJTest.assert( ! SJTest.match(foo, Bar));
		SJTest.assert(SJTest.match(bar, Bar));
		SJTest.assert(SJTest.match(bar, Foo));
	},

	"match-ES6-super-class-string-matcher": function() {
		class Foo {

		}
		class Bar extends Foo {

		}
		var foo = new Foo();
		var bar = new Bar();
		SJTest.assert(SJTest.match(bar, "Foo"));
		SJTest.assert( ! SJTest.match(bar, "Goo"));
		SJTest.assert(SJTest.match(bar, "?Foo"));
	},

	"match-classJSDoc?": function() {
		SJTest.assertMatch(null, "?Number");
		SJTest.assertMatch(1, "?Number");
		SJTest.assertMatch(0, "?Number");
	},

	"match-classJSDoc|": function() {
		SJTest.assertMatch(1, "Number|String");
		SJTest.assertMatch(0, "Number|String");
		SJTest.assertMatch('foo', "Number|String");
		SJTest.assertMatch('', "Number|String");

		SJTest.assertMatch('foo', "foo|bar");
	},


	"match-bool": function() {
		SJTest.assert(SJTest.match(true, Boolean), true);
		SJTest.assert(SJTest.match(false, Boolean), false);
		SJTest.assert( ! SJTest.match(true, Number), true);

		SJTest.assert(SJTest.match(true, true), true);
		SJTest.assert(SJTest.match(false, false), false);
	},

	"match-num": function() {
		SJTest.assert(SJTest.match(0, Number), 0);
		SJTest.assert( ! SJTest.match('a', Number));

		var nan = NaN; //0/0;

		SJTest.assert(SJTest.isa(nan, Number), "isa"+nan);

		SJTest.assert( ! SJTest.match(nan, Number), nan);
	},

	"match-array": function() {
		SJTest.assertMatch([1,2], [1,2]);
		var x = ["a"]; x.push("b");
		SJTest.assertMatch(x, ["a","b"]);
		SJTest.assert( ! SJTest.match(['a'], ['b']));
		SJTest.assert( ! SJTest.match(['a'], ['a', 'b']));
	},

	"match-array-corner-cases": function() {
		// weird but true: "a" == ["a"] wtf js?!
		SJTest.assert(SJTest.match('a', ['a']));
		// Shall we change this? we allow the matcher to be a subset of the value
		SJTest.assert(SJTest.match(['a','b'], ['a']));
	},

	"match-num-string": function() {
		SJTest.assertMatch("0", Number);
		SJTest.assertMatch("123", Number);
		SJTest.assert( ! SJTest.match("foo", Number));
		SJTest.assert( ! SJTest.match("", Number));

		SJTest.assertMatch("0", 'Number');
		SJTest.assertMatch("123", 'Number');
		SJTest.assert( ! SJTest.match("foo", 'Number'));
		SJTest.assert( ! SJTest.match("", 'Number'));
	},

	"waitFor": function(test) {
		var s = new Date().getTime();
		var fn = function(){ var d = new Date().getTime() - s; return d > 1000;};
		assert( ! fn());
		test.setStatus('waiting');
		window.waitForCallback = false;
		SJTest.waitFor(fn, function() {window.waitForCallback = 'OK';})
		.done(function() {
			assert(fn());
			assert(window.waitForCallback === 'OK');
			test.setStatus('pass');
		});
	},

	"removeValue": function() {
		SJTest.assertMatch(SJTest.removeValue("a", ["b", "a"]), ["b"]);
		SJTest.assertMatch(SJTest.removeValue("a", ["b"]), ["b"]);
		SJTest.assertMatch(SJTest.removeValue("a", []), []);
		SJTest.assertMatch(SJTest.removeValue("a", ["a"]), []);
		SJTest.assertMatch(SJTest.removeValue("a", ["a", "b", "c"]), ["b", "c"]);
	}
};

SJTest.run(SJTestTest);
