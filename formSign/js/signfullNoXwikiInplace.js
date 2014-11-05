(function ($) {
    $app.module("SignPluginsModule", function (Log, PostSignFilesModule, Ajax, InstantMessageModule, JsonModule) {
        var pluginsMap = {
                csp: {
                    getKeyList: "cspGetKeyList",
                    sign: function (plugin, params, password, certData, pluginSpecial) {
                        var certInfo = plugin["getCertificateById"](certData["numToken"], certData["uid"]);
                        _.extend(params, certData, {password: password, certInfo: certInfo});
                        if (certInfo) {
                            params["numToken"] = parseInt(params["numToken"]);
                            params["sig"] = (params["ext"] == "pkcs7") ?
                                plugin["signFileById"](params["numToken"], params["uid"], params["password"], pluginSpecial.fileApplet, 1) :
                                plugin["hashSignDataAnyById"](params["numToken"], params["uid"], params["password"], params["dataForSing"]);
                            PostSignFilesModule.post(params, function () {
                                Log.log("PostSignFilesModule success");
                            });
                        } else {
                            InstantMessageModule.error(21);
                        }
                    },
                    getErrorCode: "cspGetErrorCode",
                    valid: function (plugin) {
                        return plugin.valid;
                    },
                    version: function (plugin) {
                        return plugin().version;
                    },
                    load: function () {
                        var deferred = new $.Deferred(),
                            target = $("#pluginCSP");
                        Log.log("SignPluginModule:csp plugin is loading");
                        window.pluginLoadedCSP = function () {
                            deferred.resolve();
                        };
                        if (target.length == 0) target = $('<div id="pluginCSP"><object type="application/x-csuser" width="0" height="0"><param name="onload" value="pluginLoadedCSP"/></object></div>').appendTo("body");
                        return {
                            target: target.children('object').get(0),
                            loaded: deferred
                        };
                    }
                },
                firebreath: {
                    getKeyList: function (plugin) {
                        var certificatesList = plugin.getCertificateList();
                        var certificateInfo = [];
                        for (var i = 0; i < certificatesList.length; i++) {
                            var certificate = certificatesList[i],
                                containerID = certificate.getContainerId(),
                                certificateBase64 = plugin.getCertificate(containerID).getBase64(),
                                hidePassword = certificate.isCAPI(),
                                outdated = '';
                            certificateInfo.push([i, certificate.getId(), certificate.getSubjectDN().getCommonName(), certificate.getIssuerDN().getCommonName(), containerID, hidePassword, true, certificate.getValidFrom(), certificate.getValidTo(), outdated, certificateBase64].join("::"));
                        }
                        return certificateInfo;
                    },
                    version: function (plugin) {
                        return plugin.getPluginVersion();
                    },
                    sign: function (plugin, params, password, certData) {
                        params["numToken"] = parseInt(params["numToken"]);
                        var deferred = new $.Deferred();
                        if (params["ext"] == "pkcs7") {
                            Ajax.send({
                                url: '../../xwiki-services/attachments',
                                data: {
                                    space: params["spaceDoc"],
                                    name: params["technology"],
                                    attachName: params["fileName"],
                                    action: "encoder",
                                    tstamp: new Date().getTime()
                                },
                                success: function (json) {
                                    var data = JsonModule.parse(json);
                                    if (data) {
                                        var encodeFile = data["filebase64"];
                                        params["sig"] = plugin.signDataBase64CmsDetached(certData["containerId"], password, encodeFile);
                                        deferred.resolve();
                                    }
                                },
                                error: function (xhr) {
                                    InstantMessageModule.error(22, xhr.responseText);
                                }
                            });
                        } else {
                            params["sig"] = plugin.signDataSimple(certData["containerId"], password, params["dataForSing"]);
                            deferred.resolve();
                        }
                        deferred.done(function () {
                                if (params["sig"] && (plugin.getErrorCode() == 0)) {
                                    PostSignFilesModule.post(params, certData, function () {
                                        Log.log("PostSignFilesModule success");
                                    });
                                    params.message.info("", "", 12);
                                } else {
                                    InstantMessageModule.error(52);
                                }
                            }
                        );
                    },
                    getErrorCode: "getErrorCode",
                    valid: function (plugin) {
                        return plugin.isValid();
                    },
                    load: function () {
                        var deferred = new $.Deferred(),
                            target = $("#pluginFire");
                        Log.log("SignPluginModule:firebreath plugin is loading");
                        window.pluginFireLoaded = function () {
                            deferred.resolve();
                        };
                        if (target.length == 0) target = $('<div id="pluginFire"><object type="application/x-ifcplugin" width="0" height="0"><param name="onload" value="pluginFireLoaded"/></object></div>').appendTo("body");
                        return {
                            target: new IFCPlugin(target.children('object').get(0)),
                            loaded: deferred
                        };
                    }
                },
                jcp: {
                    getKeyList: function (plugin) {
                        return plugin["getKeysInfo"]().split(',');
                    },
                    sign: function (plugin, params, password, certData) {
                        var certInfo = plugin.getCertificate(certData["uid"]);
                        _.extend(params, certData, {password: password, certInfo: certInfo});
                        certData['certInfo'] = certInfo;
                        if (certInfo) {
                            var deferred = new $.Deferred();
                            if (params["ext"] == "pkcs7") {
                                Ajax.send({
                                    url: '../../xwiki-services/attachments',
                                    data: {
                                        space: params["spaceDoc"],
                                        name: params["technology"],
                                        attachName: params["fileName"],
                                        action: "encoder"
                                    },
                                    success: function (json) {
                                        var data = JsonModule.parse(json);
                                        if (data) {
                                            var encodeFile = data["filebase64"];
                                            params["sig"] = plugin["signCMS"](params["uid"], params["password"], encodeFile);
                                            Log.debug('sign signCMS', params["sig"]);
                                            deferred.resolve();
                                        }
                                    },
                                    error: function (xhr) {
                                        InstantMessageModule.error(22, xhr.responseText);
                                    }
                                });
                            } else {
                                Log.debug('sign uid ', params["uid"], params["password"], params["dataForSing"]);
                                params["sig"] = plugin["signXml"](params["uid"], params["password"], params["dataForSing"]);
                                Log.debug('sign signCrude', params["sig"]);
                                deferred.resolve();
                            }
                            deferred.done(function () {
                                if (params["sig"]) {
                                    PostSignFilesModule.post(params, certData, function () {
                                        Log.log("PostSignFilesModule success");
                                    });
                                }
                                else {
                                    InstantMessageModule.error(24);
                                }
                            });
                        } else {
                            InstantMessageModule.error(21);
                        }
                    },
                    getErrorCode: function (plugin) {
                        return plugin.getErrorCode();
                    },
                    version: function (plugin) {
                        return plugin["getJREVersion"]();
                    },
                    valid: function (plugin) {
                        return plugin.isValid();
                    },
                    load: function () {
                        var deferred = new $.Deferred(),
                            appletOptions = {
                                ready: 2,
                                javaVersion: "1.7.0_21"
                            },
                            pluginJCP = window["pluginJCP"];
                        var versions = deployJava.getJREs();
                        var minorCheck = function () {
                            var match = false;
                            _.each(versions, function (version) {
                                var rgx = new RegExp("^" + version, "i");
                                match = match || rgx.test(appletOptions.javaVersion);
                            });
                            return match;
                        };
                        if (_.indexOf(versions, appletOptions.javaVersion) == -1) {
                            if (!versions || !versions.length) {
                                InstantMessageModule.error("Плагин java не обнаружен. Необходимая для плагина JCP версия java: " + appletOptions.javaVersion);
                                deferred.reject();
                                return {
                                    target: pluginJCP,
                                    loaded: deferred
                                };
                            } else {
                                if (!minorCheck()) {
                                    InstantMessageModule.error("Необходимая для плагина JCP версия java: " + appletOptions.javaVersion + ", обнаружена: " + versions.join(", "));
                                    deferred.reject();
                                    return {
                                        target: pluginJCP,
                                        loaded: deferred
                                    };
                                }
                            }
                        }
                        var runApplet = function () {
                            var attributes = { id: 'pluginJCP', code: 'ru.atc.sir.security.jcp.applet.SignApplet',
                                codebase: '/jbpm-console-v2.0/formSign/applet/',
                                archive: 'security-crypto-3.0-SNAPSHOT.jar',
                                width: 0, height: 0};
                            var parameters = {java_status_events: 'true'};
                            deployJava.runApplet(attributes, parameters, '1.7');
                            pluginJCP = window["pluginJCP"];
                        };
                        if (!pluginJCP) runApplet();
                        var onLoadHandler = function () {
                            deferred.resolve();
                        };
                        var onErrorHandler = function () {
                            deferred.reject();
                        };
                        if (!pluginJCP) {
                            Log.error("Не найден объект для плагина JSP");
                            deferred.reject();
                        } else {
                            switch (pluginJCP.status) {
                                case 1:
                                    pluginJCP.onLoad = onLoadHandler;
                                    pluginJCP.onError = onErrorHandler;
                                    break;
                                case 2:
                                    deferred.resolve();
                                    break;
                                default:
                                    deferred.reject();
                            }
                        }
                        return {
                            target: pluginJCP,
                            loaded: deferred
                        };
                    }
                }
            }
            ;
        var preLoadPluginsList = function (moduleBody, pluginsList) {
            var bestIndex = undefined;
            _.each(pluginsList, function (pluginName, index) {
                var loadData = pluginsMap[pluginName].load();
                loadData.loaded.done(function () {
                    if (bestIndex === undefined || index < bestIndex) {
                        Log.log("SignPluginModule: plugin " + pluginName + "\" loaded");
                        moduleBody.pluginName = pluginName;
                        moduleBody.target = loadData.target;
                        if (!moduleBody.call("valid")) {
                            Log.log("SignPluginModule: plugin " + pluginName + "\" is invalid");
                            moduleBody.pluginName = null;
                            moduleBody.target = null;
                        } else {
                            Log.log("SignPluginModule: plugin " + pluginName + "\" is valid");
                            moduleBody.activated = true;
                            moduleBody.active = pluginName;
                            bestIndex = index;
                        }
                    }
                });
            });
        };
        var loadPlugin = function (moduleBody, pluginName, success, fail) {
            var loadData = pluginsMap[pluginName].load();
            loadData.loaded.done(function () {
                Log.log("SignPluginModule: plugin " + pluginName + "\" loaded");
                moduleBody.pluginName = pluginName;
                moduleBody.target = loadData.target;
                if (!moduleBody.call("valid")) {
                    Log.log("SignPluginModule: plugin " + pluginName + "\" is invalid");
                    moduleBody.pluginName = null;
                    moduleBody.target = null;
                    if (fail) fail();
                } else {
                    Log.log("SignPluginModule: plugin " + pluginName + "\" is valid");
                    moduleBody.activated = true;
                    moduleBody.active = pluginName;
                    if (success) success();
                }
            }).fail(function () {
                    Log.log("SignPluginModule: plugin " + pluginName + "\" failed to load");
                    if (fail) fail();
                });
        };
        return {
            active: false,
            activated: false,
            preLoad: function (pluginsList) {
                if (!this.activated) {
                    preLoadPluginsList(this, pluginsList);
                }
            },
            load: function (pluginName, success, fail) {
                if (!this.activated) {
                    loadPlugin(this, pluginName, success, fail);
                }
            },
            call: function (methodName) {
                var result = undefined;
                Log.log("SignPluginModule call \"" + methodName + "\"");
                var pluginName = this.pluginName,
                    target = this.target;
                if (!pluginName || !target) {
                    Log.error("SignPluginModule: plugin target is not registered");
                    return result;
                }
                var plugin = pluginsMap[pluginName];
                if (plugin === undefined) {
                    Log.error("SignPluginModule: plugin \"" + pluginName + "\" is undefined");
                    return result;
                }
                var methodValue = plugin[methodName];
                if (methodValue === undefined) {
                    Log.error("SignPluginModule: method \"" + methodValue + "\" is undefined");
                    return result;
                }
                if (_.isFunction(methodValue)) {
                    try {
                        result = methodValue.apply(target, [target].concat(_.rest(arguments)));
                    } catch (e) {
                        Log.error("SignPluginModule: method \"" + methodName + "\" returned error \"" + e.message + "\"");
                    }
                    return result;
                }
                if (!_.isString(methodValue) || !methodValue) {
                    Log.error("SignPluginModule: method value \"" + methodValue + "\" is erroneous");
                    return result;
                }
                var method = target[methodValue];
                if (method === undefined) {
                    Log.error("SignPluginModule: method \"" + methodValue + "\" is undefined");
                    return result;
                }
                try {
                    result = method.apply(target, _.rest(arguments));
                } catch (e) {
                    Log.error("SignPluginModule: method \"" + methodName + "\" returned error \"" + e.message + "\"");
                }
                return result;
            }
        };
    })
    ;
})
    (window["$x"]);
