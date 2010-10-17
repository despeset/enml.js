describe("Enml Grammar", function(){
  var mydsl;
  
  beforeEach(function() {
    mydsl = new ENML.grammar('myDsl');
  });
  
  it("should accept new tag definitions through the define state machine", function(){
    mydsl.define('foo').as("<div class='foo'>%TC</div>");
    expect(mydsl.definitions.foo.template).toEqual("<div class='foo'>%TC</div>");
  });
  
  it("should accept definitions through as.builders", function(){
    mydsl.define('foo').as.cssProxy('div')
    expect(mydsl.definitions.foo.template).toEqual("<div class='foo'>%TC</div>");
  });
  
  it("should allow multiple definitions to be chained", function(){
    mydsl.define('foo').as.cssProxy('div').define('bar').as.cssProxy('span');
    expect(mydsl.definitions.foo.template).toEqual("<div class='foo'>%TC</div>");
    expect(mydsl.definitions.bar.template).toEqual("<span class='bar'>%TC</span>");
  });

  it("should accept definitions with attributes", function(){
    mydsl.define('foo').plus({ color: 'rgb(255,255,0)' }).as("<div class='foo' style='color:%COLOR;'>%TC</div>");
    expect(mydsl.definitions.foo.attr).toEqual({ color: 'rgb(255,255,0)' });
  });
  
  it("should allow validating arguments and functional templates", function(){
    mydsl
      .define('fig')
        .plus({ 
          image_number: { 
            defaults_to: 0, 
            valid: /[0-9]{1,3}?/, 
            error: 'Image number must be between 1 and 999.'
          },
          caption: '', 
          copyright: '', 
          position: { 
            defaults_to: 'left', 
            valid: ['left', 'right']
          }})
        .as(function(context, args){
          return (context.images.length <= args.image_number) ? '<div class="fig %POSITION"><img src="'+context.images[args.image_number-1]+'" /><span class="caption">%CAPTION</span><span class="copyright">%COPYRIGHT</span></div>' : mydsl.addError('Could not find '+args.image_number+'');
        });
        
    expect(mydsl.definitions.fig.attr.image_number.error).toEqual('Image number must be between 1 and 999.');
    expect(typeof mydsl.definitions.fig.template).toEqual('function');
  });
  
  it("should only overwrite existing definitions if explicitly forced", function(){
    mydsl.define('foo').as('foo1');
    mydsl.define('foo').as('foo2');
    expect(mydsl.definitions.foo.template).toEqual('foo1');
    mydsl.define('foo').by_force().as('foo3');
    expect(mydsl.definitions.foo.template).toEqual('foo3');
  })
  
});

describe('Enml Parser', function(){
  var mydsl;
  
  beforeEach(function(){
    mydsl = new ENML.grammar('myDsl');
    mydsl
      .define('foo')
        .as.cssProxy('div')
      .define('bar')
        .as.cssProxy('span')
      .define('image')
        .plus({ 
          image_number: { 
            defaults_to: 0, 
            valid: '/[0-9]{1,3}?/', 
            error: 'Image number must be between 1 and 999.'
          },
          position: { 
            defaults_to: 'left', 
            valid: ['left', 'right']
          }})
        .as("<img src='#%IMAGE_NUMBER' class='%POSITION' /><span>%TC</span>");
  });
  
  it('should parse normal text strings', function(){
    expect(mydsl.parse("Hello world"))
    .toEqual("Hello world");
  });
  
  it('should parse lone enml tags', function(){
    expect(mydsl.parse("[foo:bar]"))
    .toEqual("<div class='foo'>bar</div>");
  })
  
  it('should parse mix of tags and text', function(){
    expect(mydsl.parse("Text and [foo: tags]"))
    .toEqual("Text and <div class='foo'>tags</div>");
  });
  
  it('should parse a basic reference tag', function(){
    expect(mydsl.parse("[1: Daniel Mendel][1: http://www.github.com/danielmendel]"))
    .toEqual("<a href='http://www.github.com/danielmendel'>Daniel Mendel</a>");
  });
  
  it('should parse references with and inside nested tags', function(){
    expect(mydsl.parse("[foo: nested [bar: tags ] and [1: links with nested [bar: tag]]][1: http://www.google.com]"))
    .toEqual("<div class='foo'>nested <span class='bar'>tags</span> and <a href='http://www.google.com'>links with nested <span class='bar'>tag</span></a></div>");
  });
  
  it('should parse multiple references with the same source', function(){
    expect(mydsl.parse("[1: ref1][2: ref2][1: ref1 again][3: ref3][1: http://1.ref.com][2: http://2.ref.com][3: http://3.ref.com]"))
    .toEqual("<a href='http://1.ref.com'>ref1</a><a href='http://2.ref.com'>ref2</a><a href='http://1.ref.com'>ref1 again</a><a href='http://3.ref.com'>ref3</a>");
  });
  
  it('should parse complex tags with attributes', function(){
    expect(mydsl.parse("[image: image_number='10' position='right' some image.]"))
    .toEqual("<img src='#10' class='right' /><span>some image.</span>");
  });
  
  it('should correctly handle whitespace', function(){
    expect(mydsl.parse("    [    image:     image_number='10'        position='right'       some image.    ]    "))
    .toEqual("<img src='#10' class='right' /><span>some image.</span>");
    expect(mydsl.parse("[foo:bar][bar:foo]"))
    .toEqual("<div class='foo'>bar</div><span class='bar'>foo</span>");
    expect(mydsl.parse("[foo: bar][bar: foo]"))
    .toEqual("<div class='foo'>bar</div><span class='bar'>foo</span>");
    expect(mydsl.parse(" [foo: bar ] [bar: foo ] "))
    .toEqual("<div class='foo'>bar</div> <span class='bar'>foo</span>");
  });
  
  it('should correctly parse escaped tags', function(){
    expect(mydsl.parse("[/not a [foo: tag]]"))
    .toEqual("[not a <div class='foo'>tag</div>]");
  });
  // it "should correctly parse escaped brackets" do
  //   @formatter.format("This is escaped: [/something in brackets]").should == "This is escaped: [something in brackets]"
  // end
  // 
  // it "should correctly parse escaped brackets nested inside tags" do
  //   @formatter.format("This is nested and escaped [red: [/something in brackets]]?").should == "This is nested and escaped <span class='red'>[something in brackets]</span>?"
  // end
  // 
  // it "should correctly parse tags nested inside escaped brackets" do
  //   @formatter.format("This [/bracketed text has a [red: tag]]").should == "This [bracketed text has a <span class='red'>tag</span>]"
  // end
  // 
  // it "should parse complex tags with attributes and content with nested tags" do
  //    @formatter << Enml::TemplatedInterpreter.new({:name => "banner", :template => "<div class='banner %position'>%tc</div>", :attributes => {:position => 'left'}})
  //    @formatter.format("[banner: position='right' This [red: banner] is positioned right! ]").should == "<div class='banner right'>This <span class='red'>banner</span> is positioned right! </div>"
  // end
  // 
  // it "should parse complex tags without attributes and use default values" do
  //     @formatter << Enml::TemplatedInterpreter.new({:name => "banner", :template => "<div class='banner %position'>%tc</div>", :attributes => {:position => 'left'}})
  //    @formatter.format("[banner: This [red: banner] is positioned left!]").should == "<div class='banner left'>This <span class='red'>banner</span> is positioned left!</div>"
  // end
  // 
  // it "should parse lists" do
  //   @formatter << Enml::ListInterpreter.new({:name => "list", :template => "<ul><h1>%title</h1>%tc</ul>", :attributes => {:title => ''}})
  //   @formatter.format("[list: title='Some information in a list'
  //     - Item 1
  //     - Item 2
  //     - Item 3
  //   ]").should == "<ul><h1>Some information in a list</h1><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"
  // end
  // 
  // it "should parse lists with nested tags and links" do
  //   @formatter << Enml::ListInterpreter.new({:name => "list", :template => "<ul><h1>%title</h1>%tc</ul>", :attributes => {:title => ''}})
  //   @formatter.format("[list: title='Some information in a list'
  //     - Item 1
  //     - [red: [1: Item 2]]
  //     - Item 3
  //   ][1: http://www.example.com]").should == "<ul><h1>Some information in a list</h1><li>Item 1</li><li><span class='red'><a href='http://www.example.com'>Item 2</a></span></li><li>Item 3</li></ul>"
  // end
});