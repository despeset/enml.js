ENML = { 
  crappy_extend: function(sewer, flush){ 
    // recursive = (typeof recursive != 'undefined') ? recursive : false ; // ha ha.
    for(crap in flush){
      sewer[crap] = flush[crap];
    }
  }
};

// Parser takes enml through #parse and returns a node tree.
ENML.parser = function Parser(){
  var p = this, 
      _builder, 
      _buffer = [],
      syn = {
        open: /^[\s]*\[/,
        closed: /^[\s]*]/,
        name: /^[\s]*([A-Za-z0-9_-]+):/,
        attr: /^[\s]*([A-Za-z0-9_-]+)[\s]*=[\s]*('[^']+'|"[^"]")/, 
        text: /^[\s]*[^\]\[]+/,
        reference: /^[\s]*([0-9]+):/
      };
      
  if(arguments.length > 0) ENML.crappy_extend(syn, arguments[0]);
  
  function Node(val, label, parent){
    var n = this;
    n.parent = parent;
    n.children = [];
    n.children.each = function(fn){ var u = this.length; for(var i=0;i<u;i++){ fn(this[i]); }};
    n.is = label;
    n.val = val;
    // n.text = function(){
    //   ret = n.val;
    //   n.children.each(function(child){
    //     ret += child.text();
    //   })
    //   return ret;
    // }
    n.attr = {};
  };
  
  function Builder(){
    var b = this,
    current_node = new Node('', 'root', null);
    
    b.root = current_node;
    
    b.open = function(name){
      node = new Node(name, 'tag', current_node);
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
    
  };
  
  function _next(){
    var open = _buffer.match(syn.open);
    var closed = _buffer.match(syn.closed);
    var ret = false;
    if(open) { ret = open; ret.open = true; }
    if(closed) { ret = closed; ret.open = false; }
    return ret;
  }
  
  function _consume(){
    var text = _buffer.match(syn.text);
    if(text){
      _builder.add(text[0]);
      _buffer = _buffer.substring(text[0].length);
    }
    var tag = _next();
    if(tag){ // enml found
      if(tag.open){
        _buffer = _buffer.substring(tag[0].length);
        var name = _buffer.match(syn.name);
        if(name){
          _builder.open(name[1]);
          _buffer = _buffer.substring(name[0].length);
          var looking = true;
          while(looking){
            var attr = _buffer.match(syn.attr);
            if(attr){
              _builder.set(attr[1],attr[2].substring(1,attr[2].length-1));
              _buffer = _buffer.substring(attr[0].length);
            }
            else looking = false;
          }
        }
        else { } // error        
      }
      else { // closing tag
        _builder.close();
        _buffer = _buffer.substring(tag[0].length);
      }
    }
    else{ // no more enml code
      _buffer = false; // kill the buffer
    }
  };
  
  p.parse = function(enml){
    _buffer = enml;
    _builder = new Builder();
    while(_buffer){
      _consume();
    }
    return _builder.root.children;
  };
  
  p.inspect = function(){
    return syn;
  };
  
};

// Grammar defines, interfaces with and renders a DSL.
ENML.grammar = function Grammar(name, options){
  
  var g = this,
    _parser = new ENML.parser(),
    _options = {
      output: 'html',
      knows: 'h1, h2, h3, h4, h5, header, section, footer',
      error_template: '<div class="enml_error_message"><h1>Error</h1><p>%MESSAGE</p></div>'
    },
    _callbacks = {
      starting: {},
      exiting: {}
    };
    
  g.name = name;
  // $.extend(_options, options, true); //TODO: make this happen without jQuery.
  g.definitions = {};
  // g.definitions.each = function(fun){ var u = this.length; for(var i=0; i<u; i++){ fun(this[i]); } return this };
  g.state = 'uninitialized';
        
  function definition(tagname){
    var d = this;
    d.name = tagname;
    d.attr = {};
    d.template = "";
    d.force = false;
    d.aliases = [];
  };
  
  function _define_indefinite(){
    if(typeof g.definitions[g.indefinite.name] != 'undefined'){
      if(g.indefinite.force) g.definitions[g.indefinite.name] = g.indefinite ;
    }
    else g.definitions[g.indefinite.name] = g.indefinite;
    
    // var u = g.definitions.length,
    //     exists = false;
    // g.definitions.each(function(def, i){ exists = (def.name == g.indefinite.name) ? i : exists; };
    // if(typeof exists == 'number'){
    //   if(g.indefinite.force) g.definitions[exists] = g.indefinite;
    // }
    // else g.definitions.push(g.indefinite);
    // g.indefinite = null;
  };
  
  function _state(){
    if(typeof _callbacks.exiting[g.state] == 'function') _callbacks.exiting[g.state]();
    g.state = arguments[0];
    if(typeof _callbacks.starting[g.state] == 'function') _callbacks.starting[g.state]();
  };
  
  function _assert_state(state_name){
    return (_state != state_name) ? false : true ;
  };
  
  g.parser = function(){ return _parser; }
  
  g.syntax = function(open_code, close_code){
    _parser = new ENML.parser({ open: new RegExp("^[\\s]*"+open_code),
                                closed: new RegExp("^[\\s]*"+close_code),
                                text: new RegExp("^[\\s]*"+"[^"+open_code+close_code+"]*") });
    
    return g.parse("Testing!");
  };
  
  g.define = function(tagname){
    _state('defining');
    g.indefinite = new definition(tagname);
    if(arguments > 1) g.indefinite.aliases = arguments.slice(1);
    
    return g;
  };
  
  g.by_force = function(){
    _assert_state("defining");
    g.indefinite.force = true;
    
    return g;
  }
  
  g.plus = function(attr){
    _assert_state('defining');
    g.indefinite.attr = attr;
    
    return g;
  }
  
  // use for pluralized rules
  
  // g.and = function(attr){
  //
  // };
  
  _callbacks.exiting.defining = function(){
    _define_indefinite();
  };
  
  g.as = function(template){
    _assert_state('defining');
    g.indefinite.template = template;
    _state('ready');
    
    return g;
  };
  
  g.as.cssProxy = function(html_tag){
    _assert_state('defining');
    g.indefinite.template = "<"+html_tag+" class='"+g.indefinite.name+"'>%TC</+'"+html_tag+">";
    _state('ready');
    
    return g;
  }
  
  g.parse = function(enml){
    return render(_parser.parse(enml));
  };
  
  function render(nodes){
    var o = "";
    nodes.each(function(child){
      switch(child.is){
        case "text":
          o += child.val;
          break;
        case "tag":
          o += g.definitions[child.val].template.replace('%TC', render(child.children));
          break;
        case "attr_tag":
          var r = g.definitions[child.val].template.replace('%TC', render(child.children));
          for(arg in child.attr){
            r = r.replace("%"+arg.toUpperCase(), child.attr[arg]);
          }
          o += r;
          break;
      }
    });
    return o;
  };

}