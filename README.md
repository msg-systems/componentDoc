# componentDoc #

[Node](https://nodejs.org/en/) API for execute the generation for a documentation of the source code of a Single Page Application. YAML-files - concrete component.yaml-files - are the input and HTML and if wanted PDF is the output.

For the PDF Creation the node module [node-prince](https://github.com/rse/node-prince) is used.

## Motivation ##

If you use the [msg-js-spa-skeleton](https://github.com/msg-systems/msg-js-spa-skeleton) as the base of your Single Page Application one component exists out of the following fragments:

- `component.yaml`  documentation of the component itself
- `de.json` language property file - one for each language
- `xxx-ctrl.js` source code for the controller
- `xxx-model.js` source code for the model
- `xxx-view.js` source code for the view
- `xxx.less` styles for the component
- `xxx.html` markup for the component

**ComponentDoc** helps you to bundle the component.yaml-files of all components and preparing them in a nice and readable way.


## Installation ##

Use the Node Package Manager (NPM) to install this module locally (default) or globally (with option `-g`):

		$ npm install [-g] componentDoc

## Usage ##


		var componentDoc = require("componentDoc");

		componentDoc.generateDoc(files, "bld", {
			outputName: "componentDoc",
    		template: "template.hbs",
    		buildPDF: "true"
		}


## Options ##

- `outputFolder`  string - path and name of the folder for the generated documentation
- `outputName`  string - name of the generated documentation (HTML and PDF)
- `template`  string - path to the template, that should be used for the generation of the documatation
			 [**default**: folder *'template'* and the partials under *'template/partials'*]
- `buildPDF`  string - flag, if a PDF should be created as well
- `caption` string - the caption, that is displayed on the frontpage of the PDF
- `log`  function - function for log information 
- `verbose`  function - function for verbose information
- `error`  function - function for error information 



## See also ##


The command line interface for this node module [componentDoc-cli](https://github.com/msg-systems/componentDoc-cli).


## License ##

Copyright (c) 2016 msg systems ag (http://www.msg-systems.com)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.