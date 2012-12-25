ENML = { 
  shallowCopy: function(to, fr){ 
    if( typeof to === 'undefined' || typeof fr === 'undefined' ) return false;
    for(k in b){
      a[k] = b[k];
    }
    return a;
  }
};

// Parser takes enml through #parse and returns a node tree.
ENML.parser = function Parser(){
  var p = this, 
      _builder, 
      _buffer = [],
      syn = {
        open: /^\s*\[/,
        closed: /^\s*]/,
        name: /^\s*([A-Za-z0-9_-]+):/,
        attr: /^\s*([A-Za-z0-9_-]+)\s*=\s*('[^']+'|"[^"]")/, 
        text: /^(\s*[^\]\[]+)/,
        reference: /^\s*[0-9]+/,
        escaped: /^\s*\[\s*\//
      };
      
      if(arguments.length > 0) ENML.shallowCopy(syn, arguments[0]);
        
  function Node(val, label, parent){
    var n = this;
    n.parent = parent;
    n.children = [];
    n.children.each = function(fn){ var u = this.length; for(var i=0;i<u;i++){ fn(this[i]); }};
    n.is = label;
    n.val = val;
    n.attr = {};
  };
  
  function Builder(){
    var b = this,
    current_node = new Node('', 'root', null);
    
    b.root = current_node;
    
    b.open = function(name){
      node = new Node(name, 'tag', current_node);
      if(name.match(syn.reference)) node.is = 'reference';
      if(name == '__esc') node.is = 'escaped';
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
  
  function step(s){
    _buffer = _buffer.substring(s.length);
  }
  
  function rule(key,fn1,fn2){
    var m = _buffer.match(syn[key]);
    if(m) fn1(m);
    else if(typeof fn2 == 'function') fn2();
  }
  
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
        // error no name found.
      });
    });
    rule('closed', function(m){
      _builder.close();
      step(m[0]);
    });
  };
  
  p.parse = function(enml){
    _buffer = enml;
    _builder = new Builder();
    while(_buffer){
      consume();
    }
    return _builder.root.children;
  };
  
  p.inspect = function(){
    return syn;
  };
  
};

// Grammar defines, interfaces with and renders a DSL.
ENML.grammar = function Grammar(name){
  var g = this,
    _parser = new ENML.parser(),
    _callbacks = {
      starting: {},
      exiting: {}
    };

  g.name = name;
  g.state = 'uninitialized';
  g.definitions = {};
  
  function Definition(tagname){
    var d = this;
    d.name = tagname;
    d.attr = {};
    d.template = "";
    d.force = false;
    d.aliases = [];
    if(arguments.length > 1){
      ENML.crappy_extend(d, arguments[1]);
    }
  };
  
  function _define_indefinite(){
    if(typeof g.definitions[g.indefinite.name] != 'undefined'){
      if(g.indefinite.force) g.definitions[g.indefinite.name] = g.indefinite ;
    }
    else g.definitions[g.indefinite.name] = g.indefinite;
  };

  function _state(){
    if(typeof _callbacks.exiting[g.state] == 'function') _callbacks.exiting[g.state]();
    g.state = arguments[0];
    if(typeof _callbacks.starting[g.state] == 'function') _callbacks.starting[g.state]();
  };
  
  _callbacks.exiting.defining = function(){
    _define_indefinite();
  };

  function _assert_state(state_name){
    return (_state != state_name) ? false : true ;
  };
    
  g.syntax = function(open_code, close_code){
    _parser = new ENML.parser({ 
      open: new RegExp("^\\s*"+open_code),
      closed: new RegExp("^\\s*"+close_code),
      text: new RegExp("^(\\s*"+"[^"+open_code+close_code+"]+)") });
    return g;
  };
  
  g.define = function(tagname){
    _state('defining');
    g.indefinite = new Definition(tagname);
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
  
  g.as = function(template){
    _assert_state('defining');
    g.indefinite.template = template;
    
    _state('ready');
    
    return g;
  };
  
  g.as.cssProxy = function(html_tag){
    _assert_state('defining');
    g.indefinite.template = "<"+html_tag+" class='"+g.indefinite.name+"'>%TC</"+html_tag+">";
    _state('ready');
    
    return g;
  };
  
  var sources = {};
  
  g.parse = function(enml){
    sources = {};
    var nodes = _parser.parse(enml);
    var last = nodes.length-1;
    if(nodes[last].is == 'reference'){
      var collecting = true
      while(collecting){
        if(nodes[last].is == 'reference' && typeof sources['_'+nodes[last].val] == 'undefined'){
          sources['_'+nodes[last].val] = nodes[last].children[0].val;
          nodes[last].is = 'source';
          last--;
        }
        else collecting = false;
      }
    }
    return trim(render(nodes));
  };

  function trim(string){
    r = string;
    if(r.match(/^\s+|\s+$/g)){
      r = r.replace(/^\s+|\s+$/g, '');
    }
    return r;
  };

  function render(nodes){
    var o = "";
    nodes.each(function(child){
      switch(child.is){
        case "text":
          o += child.val;
          break;
        case "escaped":
          o += g.definitions.__esc.template.replace('%TC', trim(render(child.children)));
          break;
        case "tag":
          o += g.definitions[child.val].template.replace('%TC', trim(render(child.children)));
          break;
        case "reference":
          o += g.definitions.__ref.template.replace('%TC', trim(render(child.children))).replace('%REF', trim(sources['_'+child.val]));
          break;
        case "attr_tag":
          var r = g.definitions[child.val].template.replace('%TC', trim(render(child.children)));
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
  
  g.define('__ref').as("<a href='%REF'>%TC</a>");
  g.define('__esc').as("[%TC]");
  
}