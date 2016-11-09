/*
 **  componentDoc -- JavaScript lightweight documentation generator
 **  for documentation as HTML and/or PDF from 'component-yaml'-files
 **  Copyright (c) 2016 msg systems ag (http://www.msg-systems.com/)
 **
 **  Permission is hereby granted, free of charge, to any person obtaining
 **  a copy of this software and associated documentation files (the
 **  "Software"), to deal in the Software without restriction, including
 **  without limitation the rights to use, copy, modify, merge, publish,
 **  distribute, sublicense, and/or sell copies of the Software, and to
 **  permit persons to whom the Software is furnished to do so, subject to
 **  the following conditions:
 **
 **  The above copyright notice and this permission notice shall be included
 **  in all copies or substantial portions of the Software.
 **
 **  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 **  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 **  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 **  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 **  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 **  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 **  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* global require: false */

/*  standard requirements  */
var fs = require("fs-extra");
var path = require("path");

/*  extra requirements  */
var buildify = require("buildify");
var YAML = require("js-yaml");
var _ = require("lodash");
var colors = require("colors");
var Handlebars = require("handlebars");
var Prince = require("prince");

/*  registry             */
var registry = {};

/*  send caller log information      */
var log = function (options, msg) {
    if (typeof options.log === "function")
        options.log(msg);
};

/*  send caller verbose information  */
var verbose = function (options, filename, action, msg) {
    if (typeof options.verbose === "function")
        options.verbose(filename, action, msg);
};

/*  send caller error information    */
var error = function (options, filename, action, msg, fix) {
    if (typeof options.error === "function")
        options.error(filename, action, msg, fix);
};

var shortenPackageName = function (package) {
    var parts = package.split(".");
    var i = 0;
    var shortenParts = _.map(parts, function (part) {
        ++i;
        if (i < parts.length - 1) {
            return part[0]
        } else {
            return part
        }
    });
    return shortenParts.join(".");
};

var loadSource = function (source, options) {
    var contentYAML = fs.readFileSync(source, {encoding: "utf8"});
    var contentObj = YAML.safeLoad(contentYAML);
    if (!contentObj.id) {
        error(options, source, "NO ID AVAILABLE", contentObj.id, "Ensure that the component.yaml file has an id.")
    } else if (registry.hasOwnProperty(contentObj.id)) {
        error(options, source, "DUPLICATE ID", contentObj.id, "Ensure that the id of a component.yaml file is unique.")
    } else {
        contentObj.shortPackageName = shortenPackageName(contentObj.package);
        registry[contentObj.id] = contentObj;
    }
};

var createIdForKeyOnPath = function (key, level1, level2, level3, level4) {
    if (registry[key].interface[level1]) {
        var obj = registry[key].interface[level1][level2];
        if (obj && level3)
            obj = obj[level3];
        if (obj && level4)
            obj = obj[level4];
        for (var name in obj) {
            if (!obj.hasOwnProperty(name))
                continue;
            var id = key + "." + level1 + "." + level2 + ".";
            var displayPath = level1 + "." + level2 + ".";
            if (level3) {
                id += level3 + ".";
                displayPath += level3 + ".";
            }
            if (level4) {
                id += level4 + ".";
                displayPath += level4 + ".";
            }
            obj[name].id = id + name;
            obj[name].name = name;
            obj[name].displayName = displayPath + name;
        }
    }
};

var generateIdentifier = function () {
    for (var key in registry) {
        if (!registry.hasOwnProperty(key))
            continue;
        if (registry[key].interface) {
            createIdForKeyOnPath(key, "api", "call");
            createIdForKeyOnPath(key, "api", "register");

            createIdForKeyOnPath(key, "events", "publish", "toParent");
            createIdForKeyOnPath(key, "events", "publish", "toChildren");
            createIdForKeyOnPath(key, "events", "subscribe", "forChildren");
            createIdForKeyOnPath(key, "events", "subscribe", "forParent");

            var modelTypes = ["data", "param", "state", "event", "command"];
            _.forEach(modelTypes, function (modelType) {
                createIdForKeyOnPath(key, "model", "define", "global", modelType);
                createIdForKeyOnPath(key, "model", "define", "own", modelType);
                createIdForKeyOnPath(key, "model", "observe", "global", modelType);
                createIdForKeyOnPath(key, "model", "observe", "own", modelType);
            });

            createIdForKeyOnPath(key, "ui", "plug");
            createIdForKeyOnPath(key, "ui", "socket");
        }
    }
};

var createTargetIdentifierOnSourceFromTarget = function (source, targetCB) {
    if (source) {
        for (var name in source) {
            if (!source.hasOwnProperty(name))
                continue;
            for (var innerKey in registry) {
                if (!registry.hasOwnProperty(innerKey))
                    continue;
                var target = targetCB(innerKey);
                if (target) {
                    for (var targetName in target) {
                        if (!target.hasOwnProperty(targetName))
                            continue;
                        if (name === targetName) {
                            if (!source[name].hasOwnProperty("targets")) {
                                source[name].targets = []
                            }
                            source[name].targets.push({
                                name: innerKey,
                                target: target[targetName].id,
                                targetName: target[targetName].displayName
                            })
                        }
                    }
                }
            }
        }
    }

};

var generateTargetsForAPI = function (api) {
    // CALL - REGISTER
    if (api) {
        createTargetIdentifierOnSourceFromTarget(api.call, function (targetKey) {
            return registry[targetKey].interface && registry[targetKey].interface.api &&
            registry[targetKey].interface.api.register ? registry[targetKey].interface.api.register : null;
        });
        createTargetIdentifierOnSourceFromTarget(api.register, function (targetKey) {
            return registry[targetKey].interface && registry[targetKey].interface.api &&
            registry[targetKey].interface.api.call ? registry[targetKey].interface.api.call : null;
        });
    }
};

var generateTargetsForEvents = function (events) {
    if (events) {
        var publish = events.publish;
        var subscribe = events.subscribe;
        if (publish) {
            createTargetIdentifierOnSourceFromTarget(publish.toParent, function (targetKey) {
                var targetEvents = registry[targetKey].interface ? registry[targetKey].interface.events : null;
                return targetEvents && targetEvents.subscribe && targetEvents.subscribe.forChildren ? targetEvents.subscribe.forChildren : null;
            });
            createTargetIdentifierOnSourceFromTarget(publish.toChildren, function (targetKey) {
                var targetEvents = registry[targetKey].interface ? registry[targetKey].interface.events : null;
                return targetEvents && targetEvents.subscribe && targetEvents.subscribe.forParent ? targetEvents.subscribe.forParent : null;
            });
        }
        if (subscribe) {
            createTargetIdentifierOnSourceFromTarget(subscribe.forChildren, function (targetKey) {
                var targetEvents = registry[targetKey].interface ? registry[targetKey].interface.events : null;
                return targetEvents && targetEvents.publish && targetEvents.publish.toParent ? targetEvents.publish.toParent : null;
            });
            createTargetIdentifierOnSourceFromTarget(subscribe.forParent, function (targetKey) {
                var targetEvents = registry[targetKey].interface ? registry[targetKey].interface.events : null;
                return targetEvents && targetEvents.publish && targetEvents.publish.toChildren ? targetEvents.publish.toChildren : null;
            });
        }
    }

};

var generateTargetsForUI = function (ui) {
    if (ui) {
        // SOCKET - PLUG
        createTargetIdentifierOnSourceFromTarget(ui.socket, function (targetKey) {
            return registry[targetKey].interface && registry[targetKey].interface.ui && registry[targetKey].interface.ui.plug ? registry[targetKey].interface.ui.plug : null;
        });
        createTargetIdentifierOnSourceFromTarget(ui.plug, function (targetKey) {
            return registry[targetKey].interface && registry[targetKey].interface.ui && registry[targetKey].interface.ui.socket ? registry[targetKey].interface.ui.socket : null;
        });
    }
};

var generateTargetsForModels = function (model) {
    if (model) {
        // MODELS   DEFINE - OBSERVE
        var modelTypes = ["data", "param", "state", "event", "command"];
        _.forEach(modelTypes, function (modelType) {
            if (model.define) {
                if (model.define.global) {
                    createTargetIdentifierOnSourceFromTarget(model.define.global[modelType], function (targetKey) {
                        var targetModel = registry[targetKey].interface ? registry[targetKey].interface.model : null;
                        return targetModel && targetModel.observe && targetModel.observe.global && targetModel.observe.global[modelType] ?
                            targetModel.observe.global[modelType] : null;
                    });
                }
                if (model.define.own) {
                    createTargetIdentifierOnSourceFromTarget(model.define.own[modelType], function (targetKey) {
                        var targetModel = registry[targetKey].interface ? registry[targetKey].interface.model : null;
                        return targetModel && targetModel.observe && targetModel.observe.own && targetModel.observe.own[modelType] ?
                            targetModel.observe.own[modelType] : null;
                    });
                }
            }
            if (model.observe) {
                if (model.observe.global) {
                    createTargetIdentifierOnSourceFromTarget(model.observe.global[modelType], function (targetKey) {
                        var targetModel = registry[targetKey].interface ? registry[targetKey].interface.model : null;
                        return targetModel && targetModel.define && targetModel.define.global && targetModel.define.global[modelType] ?
                            targetModel.define.global[modelType] : null;
                    });
                }
                if (model.observe.own) {
                    createTargetIdentifierOnSourceFromTarget(model.observe.own[modelType], function (targetKey) {
                        var targetModel = registry[targetKey].interface ? registry[targetKey].interface.model : null;
                        return targetModel && targetModel.define && targetModel.define.own && targetModel.define.own[modelType] ?
                            targetModel.define.own[modelType] : null;
                    });
                }
            }
        });

    }
};

var generateTargets = function () {
    for (var key in registry) {
        if (!registry.hasOwnProperty(key))
            continue;
        if (registry[key].interface) {
            generateTargetsForAPI(registry[key].interface.api);
            generateTargetsForEvents(registry[key].interface.events);
            generateTargetsForUI(registry[key].interface.ui);
            generateTargetsForModels(registry[key].interface.model);
        }
    }
};

var convertObjectToArray = function (obj) {
    var array = [];
    for (var key in obj) {
        if (!obj.hasOwnProperty(key))
            continue;
        array.push(obj[key])
    }
    return array
};

var makeArrays = function () {
    var array = [];
    for (var key in registry) {
        var yamlInterface = registry[key].interface;
        if (yamlInterface) {
            if (yamlInterface.api) {
                if (yamlInterface.api.call)
                    yamlInterface.api.call = convertObjectToArray(yamlInterface.api.call);
                if (yamlInterface.api.register)
                    yamlInterface.api.register = convertObjectToArray(yamlInterface.api.register);
            }
            if (yamlInterface.events) {
                if (yamlInterface.events.publish) {
                    if (yamlInterface.events.publish.toParent)
                        yamlInterface.events.publish.toParent = convertObjectToArray(yamlInterface.events.publish.toParent);
                    if (yamlInterface.events.publish.toChildren)
                        yamlInterface.events.publish.toChildren = convertObjectToArray(yamlInterface.events.publish.toChildren);
                }
                if (yamlInterface.events.subscribe) {
                    if (yamlInterface.events.subscribe.forParent)
                        yamlInterface.events.subscribe.forParent = convertObjectToArray(yamlInterface.events.subscribe.forParent);
                    if (yamlInterface.events.subscribe.forChildren)
                        yamlInterface.events.subscribe.forChildren = convertObjectToArray(yamlInterface.events.subscribe.forChildren);
                }
            }
            if (yamlInterface.model) {
                var modelTypes = ["data", "param", "state", "event", "command"];
                _.forEach(modelTypes, function (modelType) {
                    if (yamlInterface.model.define) {
                        if (yamlInterface.model.define.global) {
                            if (yamlInterface.model.define.global[modelType])
                                yamlInterface.model.define.global[modelType] = convertObjectToArray(yamlInterface.model.define.global[modelType]);
                        }
                        if (yamlInterface.model.define.own) {
                            if (yamlInterface.model.define.own[modelType])
                                yamlInterface.model.define.own[modelType] = convertObjectToArray(yamlInterface.model.define.own[modelType]);
                        }
                    }
                    if (yamlInterface.model.observe) {
                        if (yamlInterface.model.observe.global) {
                            if (yamlInterface.model.observe.global[modelType])
                                yamlInterface.model.observe.global[modelType] = convertObjectToArray(yamlInterface.model.observe.global[modelType]);
                        }
                        if (yamlInterface.model.observe.own) {
                            if (yamlInterface.model.observe.own[modelType])
                                yamlInterface.model.observe.own[modelType] = convertObjectToArray(yamlInterface.model.observe.own[modelType]);
                        }
                    }
                });
            }
            if (yamlInterface.ui) {
                if (yamlInterface.ui.plug)
                    yamlInterface.ui.plug = convertObjectToArray(yamlInterface.ui.plug);
                if (yamlInterface.ui.socket)
                    yamlInterface.ui.socket = convertObjectToArray(yamlInterface.ui.socket);
            }
        }
        array.push(registry[key])
    }
    return array;
};

var readTemplateFile = function (filename) {
    return path.join(path.dirname(__dirname), "template", filename);
};

var registerPartials = function () {
    var targetsPartial = fs.readFileSync(readTemplateFile("partials/targets.hbs"), {encoding: "utf8"});
    var tocEntryPartial = fs.readFileSync(readTemplateFile("partials/tocTables/tocEntry.hbs"), {encoding: "utf8"});
    var tocTableAPIPartial = fs.readFileSync(readTemplateFile("partials/tocTables/tocTableApi.hbs"), {encoding: "utf8"});
    var tocTableEventsPartial = fs.readFileSync(readTemplateFile("partials/tocTables/tocTableEvents.hbs"), {encoding: "utf8"});
    var tocTableModelPartial = fs.readFileSync(readTemplateFile("partials/tocTables/tocTableModel.hbs"), {encoding: "utf8"});
    var tocTableUIPartial = fs.readFileSync(readTemplateFile("partials/tocTables/tocTableUI.hbs"), {encoding: "utf8"});
    var detailsEntryPartial = fs.readFileSync(readTemplateFile("partials/detailsEntry.hbs"), {encoding: "utf8"});
    Handlebars.registerPartial({
        targetsPartial: targetsPartial,
        tocEntryPartial: tocEntryPartial,
        tocTableAPIPartial: tocTableAPIPartial,
        tocTableEventsPartial: tocTableEventsPartial,
        tocTableModelPartial: tocTableModelPartial,
        tocTableUIPartial: tocTableUIPartial,
        detailsEntryPartial: detailsEntryPartial
    });
};

var buildHTML = function (data, dest, options) {
    var source = fs.readFileSync(options.template || readTemplateFile("template.hbs"), {encoding: "utf8"});
    if (!options.template)
        registerPartials();
    var template = Handlebars.compile(source);
    var html = template(data);
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    fs.writeFileSync(path.join(dest, options.outputName + ".html"), html, {encoding: "utf8"});
};

var buildPDF = function (dest, options) {
    Prince()
        .timeout(50 * 1000)
        .inputs(path.join(dest, options.outputName + ".html"))
        .output(path.join(dest, options.outputName + ".pdf"))
        .execute()
        .then(function () {
            console.log("PDF Creation done");
        }, function (error) {
            console.log("ERROR PDF Creation: ", util.inspect(error));
        })
};

/*  delivery packer for a given list of configs  */
var componentDoc = function (sources, options) {
    // analyse all configs and build up the bldOrder
    sources.forEach(function (source) {
        loadSource(source, options);
    });

    // generate identifier for each api entry
    generateIdentifier();

    // generate targets iv available for each api entry
    generateTargets();

    buildHTML({components: makeArrays()}, options.outputFolder, options);

    if (options.buildPDF === "true")
        buildPDF(options.outputFolder, options)
};


/*  export the packing API function  */
module.exports = {
    generateDoc: componentDoc
};