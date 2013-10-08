
# SJTest: Simple Javascript Testing

[SJTest](http://winterstein.github.io/SJTest/) provides easy-to-use unit & behaviour test tools for browser-based javascript.

> If you write web-pages with javascript, then SJTest can help you to develop & maintain them.

## 10 Second Hello World

	<html>
		<head>
			<!-- You don't need jQuery or Bootstrap, but if they're present, we use them for nicer output. -->

			<script src=''></script>
		</head>
		<body>
			<script>
				
				SJTest.run({name:'HelloWorld',

					easyTest: function() {
						assert(1+1 == 2);
					},

					failingTest: function() {
						assert(false, "Well that was never going to work");						
					}

				});
		
			</script>
		</body>
	</html>

Load this page in a browser -- adding `SJTest=on` to the url -- and you'll see this:


[Try it now](TODO)

Or from the command line, use PhantomJS to automate your testing:

	phantomjs SJTest.js HelloWorld.html

There -- you're ready to write and run tests! BUT SJTest has plenty of other useful features...

See the [Project page](http://winterstein.github.io/SJTest/), or the code, for more details.

