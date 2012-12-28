(function( scope ){


  /**
   *  Shallow copy, simple non-recursive utility function for copying key/value pairs.
   *
   *  @param {object} copy keys to this target
   *  @param {object} source to copy from
   *  @returns {object} target obj.
   *
   **/

  function shallowCopy(to, fr){ 
    if( typeof to === 'undefined' || typeof fr === 'undefined' ) return false;
    for(k in fr){
      to[k] = fr[k];
    }
    return to;
  }

  /**
   *  Removes all whitespace from the front & back of `string`
   *
   *  @private
   *  @param {string}
   *  @returns {object} whitespace trimmed input
   **/
  function trim(string){

    r = string;
    if(r.match(/^\s+|\s+$/g)){
      r = r.replace(/^\s+|\s+$/g, '');
    }
    return r;
  };



  // init vars
  var nsBackup = scope.ENML
    , ENML = {}
    ;
      
  /**
   *  Restores ENML namespace to pre-initialization state.
   *  
   *  @returns {object} ENML
   *
   **/

  ENML.noConflict = function(){
    scope.ENML = nsBackup;
    return ENML;
  };

  /**
   *  ENML's Parser module, initialized by new DSL grammars internally.
   *  Include optional `customSyntax` object to overwrite internal syntax regExp dictionary.
   *  
   *  @param {object} syntax modifications
   *  @constructor
   *  @returns {object} Parser
   *
   **/

   ENML.parser = function Parser(customSyntax){

    // init
    var p = this, 
        _builder, 
        _buffer = [],
        // ENML syntax Regular Expressions
        syn = {
          open: /^\s*\[/,
          closed: /^\s*]/,
          name: /^\s*([A-Za-z0-9_-]+):/,
          attr: /^\s*([A-Za-z0-9_-]+)\s*=\s*('[^']+'|"[^"]")/, 
          text: /^(\s*[^\]\[]+)/,
          reference: /^\s*[0-9]+/,
          escaped: /^\s*\[\s*\//
        };
    
    // syntax modifications may be passed to the parser on creation.  
    if( typeof customSyntax !== 'undefined' ) 
        shallowCopy(syn, customSyntax);
    
    /**
     *  Build a new tree node.
     *  
     *  @private
     *  @constructor
     *  @returns {object} Node
     *
     **/

    function Node(val, label, parent){
      var n = this;
      n.parent = parent;
      n.children = [];
      n.children.each = function(fn){ var u = this.length; for(var i=0;i<u;i++){ fn(this[i]); }};
      n.is = label;
      n.val = val;
      n.attr = {};
      return n;
    };

    /**
     *  Statefully decends through and creates the Node tree.
     *  
     *  @private
     *  @returns {object} Builder
     *
     **/
    
    function Builder(){
      var b = this,
      current_node = new Node('', 'root', null);
      
      b.root = current_node;
      
      b.open = function(name){
        node = new Node(name, 'tag', current_node);
        if(name.match(syn.reference)) node.is = 'reference';
        if(name === '__esc') node.is = 'escaped';
        current_node.children.push(node);
        current_node = node;
      }

      b.set = function(key, val){
        current_node.is = "attr_tag";
        current_node.attr[key] = val;
      }
      
      b.add = function(content){
        current_node.children.push(new Node(content, 'text', current_node));
      }
      
      b.close = function(){
        if(current_node.parent){
          current_node = current_node.parent;
        }
      }
      return b;      
    };

    /**
     *  Removes `s.length` from the front of the buffer.  Called as parser consumes data.
     *  
     *  @private
     *  @param {string}
     *  @returns {object}
     *
     **/

    function step(s){
      _buffer = _buffer.substring(s.length);
    }
    
    /**
     *  Matches `key` in buffer, executes `fn1` when found, `fn2` if not.
     *  
     *  @private
     *  @param {string}    key from syntax regExp dictionary
     *  @param {function}  match found callback
     *  @param {function}  match not-found callback ( optional )
     *  @returns {object}
     *
     **/

    function rule(key,fn1,fn2){
      var m = _buffer.match(syn[key]);
      if(m) fn1(m);
      else if(typeof fn2 === 'function') fn2();
    }

    /**
     *  Consume the buffer via `rule` `step` and `builder`.
     *  
     *  @private
     *  @returns {object}
     *
     **/

    function consume(){
      rule('text', function(m){
        _builder.add(m[1]);
        step(m[0]);
      });
      rule('escaped', function(m){
        _builder.open('__esc');
        step(m[0]);
      });
      rule('open', function(m){
        step(m[0]);
        rule('name', function(n){
          _builder.open(n[1]);
          step(n[0]);
          var collecting = true;
          while(collecting){
            rule('attr', function(a){
              _builder.set(a[1],a[2].substring(1,a[2].length-1));
              step(a[0]);
            }, function(){
              collecting = false;
            }); 
          }
        }, function(){
          // !TODO error: no name found.
        });
      });
      rule('closed', function(m){
        _builder.close();
        step(m[0]);
      });
    };

    /**
     *  Initiates builder & consumption.  Returns completed `Node` tree.
     *  
     *  @param {string}    Valid ENML markup.
     *  @returns {object}  Node tree.
     *
     **/

    p.parse = function(enml){
      _buffer = enml;
      _builder = new Builder();
      while(_buffer){
        consume();
      }
      return _builder.root.children;
    };
    
    /**
     *  Reflection, exposes syntax object.
     *  
     *  @returns {object}  syntax regular expressions dictionary.
     **/
    p.inspect = function(){
      return syn;
    };

    return p;
    
  };

  /** 
   *  Grammar object is used to dynamically define & render Domain Specific Languages (DSL).
   *  This is the primary public ENML class, it includes `Parser` internally.
   *  Exposes the grammar building functions `define`, `plus`, `as` & `cssProxy`.
   *  
   *     var myDSL = new ENML.grammar('myDSL');
   *     myDSL.define('foo')
   *          .as('<div class="foo">%TC%</h1>')
   *          .parse('Hmm... [foo: bar]');
   *
   *     >>> '<div class="foo">bar</div>'
   *
   *  @param {string} your DSL name
   *  @returns {object} ENML DSL parser & dynamic definition engine
   **/

  ENML.grammar = function Grammar(name, customSyntax){
    var g = this,
      _parser = new ENML.parser(customSyntax),
      _callbacks = {
        starting: {},
        exiting: {}
      };

    g.name = name;
    g.state = 'uninitialized';
    g.definitions = {};

    /**
     *  Definitions are created through the public utility methods.
     *  
     *  @private
     *  @constructor
     *  @param {string}  tag name
     *  @param {string}  options, cloned directly onto `Definition`
     *  @returns {object}  syntax regular expressions dictionary.
     **/

    function Definition( tagname, options ){
      var d = this;
      d.name = tagname;
      d.attr = {};
      d.template = "";
      d.force = false;
      d.aliases = [];
      if( typeof options === 'object' ){
        options.attr     = options.plus || options.attr     || {};
        options.template = options.as   || options.template || "";
        shallowCopy(d, options);
      }
      if( typeof options === 'string' ){
        d.template = options;
      }
      return d;
    };

    /**
     *  Utility for ensuring incoming definitions only overwrite existing ones when forced.
     *  
     *  @private
     **/

    function _define_indefinite(){
      if(typeof g.definitions[g.indefinite.name] != 'undefined'){
        if(g.indefinite.force) g.definitions[g.indefinite.name] = g.indefinite ;
      }
      else g.definitions[g.indefinite.name] = g.indefinite;
    };

    /**
     *  Updates the current grammar object state.  Triggers stateful callbacks.
     *  
     *  @private
     *  @param  {string}  new state
     **/

    function _state( state ){
      if(typeof _callbacks.exiting[g.state] === 'function') _callbacks.exiting[g.state]();
      g.state = state;
      if(typeof _callbacks.starting[g.state] === 'function') _callbacks.starting[g.state]();
    };
    
    // make sure new definitions are checked against `_define_indefinite`
    _callbacks.exiting.defining = function(){
      _define_indefinite();
    };

    /**
     *  Check if the current grammar state matches `state_name`
     *  
     *  @private
     *  @param  {string}  state name
     *  @returns {boolean} true if `state_name` matches current state
     **/

    function _assert_state(state_name){
      return g.state === state_name;
    };
      
    /**
     *  Change the ENML parser syntax to use `open_code` and `close_code` instead of the default `[]`
     *  
     *  @param  {string}  opening control code
     *  @param  {string}  closing control code
     *  @returns {object} grammar, with new internal `parser`
     **/

    g.syntax = function(open_code, close_code){
      _parser = new ENML.parser({ 
        open: new RegExp("^\\s*"+open_code),
        closed: new RegExp("^\\s*"+close_code),
        text: new RegExp("^(\\s*"+"[^"+open_code+close_code+"]+)") });
      return g;
    };
    
    /**
     *  Enter the `defining` state, specify the tagname for this definition.
     *  Optionally accepts a raw definition object.
     *  
     *  @param {string}  tag name
     *  @returns {object} grammar for chaining
     **/

    g.define = function(tagname){
      _state('defining');
      if( typeof tagname === 'string' ){
        g.indefinite = new Definition(tagname);
        if(arguments > 1) g.indefinite.aliases = arguments.slice(1);
      }
      if( typeof tagname === 'object' ){
        for( tag in tagname ){
          g.indefinite = new Definition( tag, tagname[tag] );
          g.indefinite.force = true;
          _define_indefinite();
        }
      }
      return g;
    };
    
    /**
     *  Sets the current definition to overwrite any existing definitions with the same name.
     *  
     *  @returns {object} grammar for chaining
     **/

    g.by_force = function(){
      if( !_assert_state("defining") ) throw('by_force was called but no ENML tag is being defined.');
      g.indefinite.force = true;
      
      return g;
    }
    
    /**
     *  Add an attribute set to the tag being defined.
     *     myDSL.define('chapter')
     *          .plus('title')
     *          .as('<section class="chapter"><header><h1>%TITLE</h1></header><p>%TC</p></section>')
     *          .parse("[chapter: title='Meanwhile...' Once upon a time in the west, etc.]");
     *             // => "<section class="chapter"><header><h1>Meanwhile...</h1></header><p>Once upon a time in the west, etc.</p></section>"
     *
     *  @param {object} attribute set
     *  @returns {object} grammar for chaining
     **/

    g.plus = function(attr){
      if( !_assert_state('defining') ) throw('plus was called but no ENML tag is being defined')
      g.indefinite.attr = attr;
      
      return g;
    }
    
    /**
     *  Finishes the definition, specifies a template for the rendered output of this tag.
     *
     *  @param {string} template
     *  @returns {object} grammar for chaining
     **/

     g.as = function(template){
      if( !_assert_state('defining') ) throw('as was called but no ENML tag is being defined')
      g.indefinite.template = template;
      
      _state('ready');
      
      return g;
    };
    
    /**
     *  Finishes the definition, specifies that the tag should be used as a simple `cssProxy`
     *      myDSL.define('foo')
     *           .cssProxy('h1')
     *           .parse('[foo: hi there]');
     *              // => <h1 class="foo">hi there</h1>
     *
     *  @param {string} html_tag
     *  @returns {object} grammar for chaining
     **/

    g.as.cssProxy = function(html_tag){
      if( !_assert_state('defining') ) throw('cssProxy was called but no ENML tag is being defined')
      g.indefinite.template = "<"+html_tag+" class='"+g.indefinite.name+"'>%TC</"+html_tag+">";
      _state('ready');
      
      return g;
    };
    
    var sources = {};
    
    /**
     *  Public parse method for the DSL.  Collects footnote style references & calls `render` routine.
     *
     *  @param {string} valid ENML input
     *  @returns {object} final HTML output
     **/

    g.parse = function(enml, context){
      sources = {};
      var nodes = _parser.parse(enml);
      var last = nodes.length-1;
      if(nodes[last].is === 'reference'){
        var collecting = true
        while(collecting){
          if(nodes[last].is === 'reference' && typeof sources['_'+nodes[last].val] === 'undefined'){
            sources['_'+nodes[last].val] = nodes[last].children[0].val;
            nodes[last].is = 'source';
            last--;
          }
          else collecting = false;
        }
      }
      return trim(render(nodes, context));
    };

    /**
     *  Renders a finished `Node` tree to final output via grammar definitions.
     *
     *  @param {string} Parsed ENML node tree
     *  @returns {object} finished HTML output
     **/

    function render(nodes, context){
      var o = "";
      nodes.each(function(child){
        switch(child.is){
          case "text":
            o += child.val;
            break;
          case "escaped":
            o += g.definitions.__esc.template.replace('%TC', trim(render(child.children, context)));
            break;
          case "tag":
            o += g.definitions[child.val].template.replace('%TC', trim(render(child.children, context)));
            break;
          case "reference":
            o += g.definitions.__ref.template.replace('%TC', trim(render(child.children, context))).replace('%REF', trim(sources['_'+child.val]));
            break;
          case "attr_tag":
            if( typeof g.definitions[child.val].template === 'function' ){
              // process functional template
              var args = {}
                , definition = g.definitions[child.val];
              context = context || {};
              args.tc = trim(render(child.children, context ));
              for( k in definition.attr ){
                if( definition.attr.hasOwnProperty(k) ){
                  if( typeof definition.attr[k] === 'object' && definition.attr[k].hasOwnProperty('defaults_to') )
                    args[k] = child.attr[k] || definition.attr[k].defaults_to;
                  else
                    args[k] = child.attr[k] || definition.attr[k];
                }                    
              }
              o += definition.template(context, args);
              break;
            }
            // default, process normal template
            var r = g.definitions[child.val].template.replace('%TC', trim(render(child.children, context)));
            for(arg in child.attr){
              r = r.replace("%"+arg.toUpperCase(), child.attr[arg]);
            }
            o += r;
            break;
          case 'source':
            break;
        }
      });
      
      return o;
    };
  
    // define some internally used core grammar utilities.
    g.define('__ref').as("<a href='%REF'>%TC</a>");
    g.define('__esc').as("[%TC]");
    
  }

  // write ENML to `scope`, global by default.
  scope.ENML = ENML;

})( window );