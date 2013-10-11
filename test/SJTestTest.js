
var SJTestTest = {
	name:"SJTest",
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
		SJTest.assert(SJTest.match("a", String), "a");
		SJTest.assert( ! SJTest.match(1, String), "- 1");
		SJTest.assert( ! SJTest.match("a", Number), "- a");
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
	
	"match-num-string": function() {
		SJTest.assert(SJTest.match("0", Number), "0");
	}

};

SJTest.run(SJTestTest);
