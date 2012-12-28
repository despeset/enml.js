`ENML` ( pronounced enamel ) is a simple, extensible `Domain Specific Markup Language` toolkit for creating customized `DSML`.  I wrote it for a project that required some custom display tags to augment a `Markdown` driven backend.

	// 1. create dsl
	dsl = new ENML.grammar('myDSL');

	// 2. define tags
	dsl.define('foo')
	   .as('<div class="foo">%TC</div>');

	// 3. parse ENML
	dsl.parse('Hello [foo: World!]'); // --> Hello <div class="foo">World!</div>

`ENML` tags are defined through a stateful, chainable interface

	dsl.define('foo')
	   .as('<div class="foo">%TC</div>');

they can have attributes:

	dsl.define('foo')
	   .plus({ color: '#f00' })
	   .as('<div class="foo" style="color:%COLOR">%TC</div>');

or be functional:

	dsl.define('fig')
	   .plus({ image_number: 1 })
	   .as(function( context, args ){
	   		return "<div class='fig'><img src='"+context.images[args.image_number-1]+"' />"+args.tc+"</div>";
	   	});

if you have functional templates, pass the context to the parser:

	var context = { images: ['/images/athome.jpg', '/images/atwork.jpg', '/images/fixing.jpg' ] };
	dsl.parse('Lorem ipsum... [fig: image_number="3" Johnathan fixing his computer. ]', context);
	// --> Lorem ipsum... <div class="fig"><img src="/images/fixing.jpg" />Johnathan fixing his computer.</div>

There is a `cssProxy` convenience method for simple HTML tags:

	dsl.define('foo')
	   .as('<div class="foo">%TC</div>');
	// is the same as
	dsl.define('foo')
	   .as.cssProxy('div');

You can also define `ENML` tags with an object:
		
	dsl.define({
	    foo: '<div class="foo">%TC</div>'
	  , chapter: {
	      plus: { title: '' }
	    , as: '<section class="chapter"><header><h1>%TITLE</h1></header><p>%TC</p></section>'
	  }
	});

`ENML` supports footnote style linking:

	This is a [1: link]

	[1: http://www.example.com ]

And escaping of `[]` characters:

	You can include [/] brackets by [/ escaping them ]

Setting up a customized syntax:

	dsl = new ENML.grammar('myDSL', { open:    /^\s*%%%-/,
                                      closed:  /^\s*-%%%/,
                                      escaped: /^\s*%%%-\s*\//,
                                      text:    /(^\s*[^-%])/  });

    dsl.define('foo').as.cssProxy('div');

    dsl.parse('Hello %%%-foo:World!-%%%'); // --> Hello <div class="foo">World!</div>

For more information on the API specifics, have a look through `tests/spec/EnmlSpec.js`.  Additionally, the `enml.js` source code is commented in a modified `jsDoc` format.