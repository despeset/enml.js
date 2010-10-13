mydsl = new ENML.grammer('My Domain Specific Language', { output: 'html', knows: 'header', 'h1', 'footer', 'aside', error_template: '<div class="mydslerror"><h1>Error</h1><p>%MESSAGE</p></div>' });

mydsl
  .define('foo')
    .as.cssProxy('div') 
      // [foo: bar] => "<div class='foo'>bar</div>"
  
  .define('red','green','blue')
    .as.cssProxy('span')
      // [red: stuff] => "<span class='red'>stuff</span>"
      // [green: stuff] => "<span class='green'>stuff</span>"
      // [blue: stuff] => "<span class='blue'>stuff</span>"
  
  .define('chapter')
    .plus({ title: '' })
    .as('<section class="chapter"><header><h1>%TITLE</h1></header><p>%TC</p></section>')
      // [chapter: title='Meanwhile...' Once upon a time in the west, etc.]
      // => "<section class="chapter"><header><h1>Meanwhile...</h1></header><p>Once upon a time in the west, etc.</p></section>"
      
  .define('banner')
    .plus({ size: { defaults_to: 'large', 
                    valid: ['small','medium','large'] }})
    .as('<div class="banner %SIZE">')
  
  .define('fig')
    .plus({ 
      image_number: { 
        defaults_to: 0, 
        valid: '/[0-9]{1,3}?/', 
        error: 'Image number must be between 1 and 999.'
      },
      caption: '', 
      copyright: '', 
      position: { 
        defaults_to: 'left', 
        valid: ['left', 'right']
      }})
    .as(function(context, args){
      return (context.images.length <= args.image_number) ? 
        '<div class="fig %POSITION">
            <img src="'+context.images[args.image_number-1]+'" />
            <span class="caption">%CAPTION</span>
            <span class="copyright">%COPYRIGHT</span>
          </div>'
        : mydsl.addError('Could not find '+args.image_number+'');
    });