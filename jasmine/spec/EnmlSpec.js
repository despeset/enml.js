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
    mydsl.define('foo').as.cssProxy('div');
    mydsl.define('bar').as.cssProxy('span');
  });
  
  it('should parse basic tags', function(){
    expect(mydsl.parse("This is a [foo: test]")).toEqual("This is a <div class='foo'>test</div>");
  });
  
});