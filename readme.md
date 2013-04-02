`ENML` ( let's pronounce it `enamel` ) is a simple, extensible `Domain Specific Markup Language` toolkit for creating customized `DSML`.  I wrote it for a project that required some custom display tags to augment a `Markdown` driven backend and to learn about simple `LR` recursive-decent parsing.

1. create `dsl`

		dsl = new ENML.grammar('myDSL');

2. define `tags`

		dsl.define('foo')
	   	   .as('<div class="foo">%TC</div>');

3. parse `ENML`

		dsl.parse('Hello [foo: World!]'); // --> Hello <div class="foo">World!</div>

Defining tags
===========

`ENML` tags are defined through a stateful, chainable interface

	dsl.define('foo')
	   .as('<div class="foo">%TC</div>');

they can have attributes with defaults

	dsl.define('foo')
	   .plus({ color: '#f00' })
	   .as('<div class="foo" style="color:%COLOR">%TC</div>');

there is a `cssProxy` convenience method for simple HTML tags

	dsl.define('foo')
	   .as('<div class="foo">%TC</div>');
	// is the same as
	dsl.define('foo')
	   .as.cssProxy('div');

or be functional ( functional tags are passed a context object when parsing )

	dsl.define('fig')
	   .plus({ image_number: 1 })
	   .as(function( context, args ){
	   		return "<div class='fig'><img src='"+context.images[args.image_number-1]+"' />"+args.tc+"</div>";
	   	});

you can also define `ENML` tags with an object
		
	dsl.define({
	    foo: '<div class="foo">%TC</div>'
	  , chapter: {
	      plus: { title: '' }
	    , as: '<section class="chapter"><header><h1>%TITLE</h1></header><p>%TC</p></section>'
	  }
	});

Parsing ENML
===========

Parse text written in your `dsl` with `dsl.parse( input )`.  If you have functional templates, pass the `context` to the parser:

	var context = { images: ['/images/athome.jpg', '/images/atwork.jpg', '/images/fixing.jpg' ] };
	dsl.parse('Lorem ipsum... [fig: image_number="3" Johnathan fixing his computer. ]', context);
	// --> Lorem ipsum... <div class="fig"><img src="/images/fixing.jpg" />Johnathan fixing his computer.</div>



All flavors of `ENML` support footnote style linking

	This is a [1: link]

	[1: http://www.example.com ]

And escaping of `[]` characters:

	You can include [/] brackets by [/ escaping them ]

If you like, you can set up a customized syntax:

	dsl = new ENML.grammar('myDSL', { open:    /^\s*%%%-/,
                                      closed:  /^\s*-%%%/,
                                      escaped: /^\s*%%%-\s*\//,
                                      text:    /(^\s*[^-%])/  });

    dsl.define('foo').as.cssProxy('div');

    dsl.parse('Hello %%%-foo:World!-%%%'); // --> Hello <div class="foo">World!</div>

More Info
============

The `enml.js` source code is commented in a modified `jsDoc` format and should be easy to follow.
For more information on the API specifics, have a look through the [`Jasmine`](http://pivotal.github.com/jasmine/) specs `tests/spec/EnmlSpec.js`.  A formal definition of the `ENML` grammar in Bakaus Backus–Naur Form is available in `docs/enml_grammar.bnf`.
