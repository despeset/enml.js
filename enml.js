ENML = {};
ENML.grammer = function Grammer(name, options){
  
  var g = this,
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
  g.definitions = [];
  g.state = 'uninitialized';
      
  function definition(tagname){
    this.name = tagname;
    this.attr = {};
    this.template = "";
    this.force = false;
  };
  
  function _define_indefinite(){
    var u = g.definitions.length,
        exists = false;
    for(var i=0;i<u;i++){ exists = (g.definitions[i].name == g.indefinite.name) ? i : exists ; };
    if(typeof exists == 'number'){
      if(g.indefinite.force) g.definitions[exists] = g.indefinite;
    }
    else g.definitions.push(g.indefinite);
    g.indefinite = null;
  };
  
  function _state(){
    if(typeof _callbacks.exiting[g.state] == 'function') _callbacks.exiting[g.state]();
    g.state = arguments[0];
    if(typeof _callbacks.starting[g.state] == 'function') _callbacks.starting[g.state]();
  };
  
  function _assert_state(state_name){
    return (_state != state_name) ? false : true ;
  };
  
  g.define = function(tagname){
    _state('defining');
    g.indefinite = new definition(tagname);
    
    return g;
  };
  
  g.by_force = function(){
    _assert_state("defining");
    g.indefinite.force = true;
    
    return g;
  }
  
  g.and = function(attr){
    _assert_state('defining');
    g.indefinite.attr = attr;
    
    return g;
  };
  
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

}