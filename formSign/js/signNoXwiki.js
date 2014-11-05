(function ($) {
    var errorMap = {
        1: "Атрибуты подписываемого файла не корректны. ",
        2: "Ключ подписи не доступен. ",
        3: "Нарушена целостность модуля подписания или файл некорректен. ",
        4: "Атрибуты подписываемого файла не корректны. ",
        5: "Невозможно сохранить подписанный файл. ",
        6: "Некорректные данные тех процесса. Отсутствует tp-number. ",
        7: "Внутренняя ошибка сервера. Обратитесь к системному администратору. ",
        8: "Не выбран сертификат. ",
        9: "Не введен пароль. ",
        10: "Запрос уже обрабатывается. ",
        11: "Ошибка плагина Крипто Провайдера. ",
        12: "Документ успешно подписан. ",
        13: "Атрибуты подписываемого файла не корректны. ",
        14: "не формируются данные get запроса. ",
        15: "Ошибка формирования JСP апплета. ",
        16: "Токен не установлен, либо не обнаружен сертификат подписи. ",
        17: "Ошибка сохранения файла,проверьте добавляемый файл и попробуйте снова.",
        18: "Нет прикрепленных документов. ",
        19: "Нет подписанных докмуентов. ",
        20: "Ошибка удаления файла. ",
        21: "Не корректные данные сертификата. ",
        22: "Ошибка при кодировании файла. ",
        23: "Сертификат просрочен. ",
        //ошибки csp
        24: "Введен неправильный пароль",
        33: "Не подключается Java плагин. ",
        45: "Введен неправильный пароль. ",
        47: "Введен неправильный пароль. ",
        48: "Некорректное имя процесса. ",
        49: "Отсутствует название процесса. ",
        50: "Ошибка при формировании документа. ",
        51: "Файл пуст",
        52: "Введен неправильный пароль или не выбран сертификат",
        100: "Загрузка..",
        101: "Пустой ответ от сервера. ",
        102: "Ошибка парсинга данных ответа от сервера. ",
        103: "Данный тип файлов не поддерживается. "
    };


    $app.debug = true;

    $app.config({
        Log: {
            show: true
        }
    });

    $app.controller("SignController",function (AttachmentsModule, Log) {
        if (document.createStyleSheet)
        {
            document.createStyleSheet("../formSign/css/styleNoXwiki.css");
            document.createStyleSheet("../formSign/css/jquery.fileupload-ui.css");
        }
        else
        {
            $("head").append('<link rel="stylesheet"  type="text/css"  href="../formSign/css/styleNoXwiki.css"/>');
            $("head").append('<link rel="stylesheet"  type="text/css"  href="../formSign/css/jquery.fileupload-ui.css"/>');

        }

        Log.log("SignController started");
        var linksParams = {
            openDocumentInstance: {
                method: "toggleFiles",
                update: "updateFiles",
                close: "hideFiles",
                spaceDoc: "Docflow"
            },
            showAllDocuments: {
                method: "toggleDocs",
                update: "updateDocs",
                close: "hideDocs",
                spaceDoc: "Docflow"
            },
            openDocument: {
                method: "toggleFiles",
                update: "updateFiles",
                close: "hideFiles",
                spaceDoc: "Docflow"
            },
            openFrameWindow: {
                method: "openXWiki"
            }
        };
        var callAttachmentsModule = function (inst, methodName) {
            var method = AttachmentsModule[methodName];
            Log.log("SignController calling AttachmentsModule method \"" + methodName + "\"");
            if (method) {
                method.call(AttachmentsModule, inst);
            } else {
                Log.error("AttachmentsModule has no method \"" + methodName + "\"");
            }
        };
        var callback = function (type) {
            return function (params) {
                var inst = {spaceDoc: params.spaceDoc, technology: params.technology, callbacks: params.callbacks, update: params.update, close: params.close, onStartStatus: params.onStartStatus};
                callAttachmentsModule(inst, inst[type]);
            }
        };
        var callbacks = {
            update: callback("update"),
            close: callback("close")
        };
        var applyTp = function (paramName, paramValue) {
            return function (technology) {
                if (typeof technology == 'string' || technology instanceof String) {
                    var index = technology.indexOf('#');
                    if (index != '-1') {
                        technology = technology.substring(0, index);
                    }
                    if (technology && paramName == "openDocument" && !/instance$/i.test(technology)) technology += "Instance";
                }
                var methodName = paramValue.method,
                    inst = {spaceDoc: paramValue.spaceDoc, technology: technology, callbacks: callbacks, update: paramValue.update, close: paramValue.close};
                callAttachmentsModule(inst, methodName);
            };
        };
        var bindLinks = function () {
            $('td:contains("Обращения")').parent().remove();
            $.each(linksParams, bindLink);
            $("a[href='#']").click(function (event) {
                event.preventDefault();
            });
        };
        var bindLink = function (paramName, paramValue) {
            window[paramName] = applyTp(paramName, paramValue);
        };
        bindLinks();
    }).exec();

    $app.module("JsonModule", function (InstantMessageModule, Log) {
        return {
            parse: function (json) {
                Log.log("JsonModule parse");
                var data;
                if (!json) {
                    InstantMessageModule.error(101);
                    Log.warn("JsonModule parse error: no data");
                } else {
                    try {
                        data = JSON.parse(json);
                    }
                    catch (e) {
                        InstantMessageModule.error(102);
                        Log.warn("JsonModule parse error");
                    }
                }
                return data;
            }
        }
    });

    $app.module("AttachmentsModule", function (Ajax, AttachmentsDrawModule, Log, JsonModule, InstantMessageModule) {
        var local = {
            prepareFilesData: function (attachmentsData, inst) {
                Log.log("AttachmentsModule prepareFilesData");
                attachmentsData["activeTabSigned"] = inst.activeTabSigned;
                inst.activeTabSigned = false;
                _.each(attachmentsData["attachments"], function (attachment) {
                    attachment.loadFileUrl = "../../xwiki-services/attachments?action=loadfileview&space=" + inst["spaceDoc"] + "&name=" + inst["technology"] + "&attachName=" + attachment["attachNameEncoded"];
                });
                _.each(attachmentsData["signedAttachments"], function (attachment) {
                    attachment.loadFileUrl = "../../xwiki-services/attachments?action=loadfileview&space=" + inst["spaceDoc"] + "&name=" + inst["technology"] + "&attachName=" + attachment["attachNameEncoded"];
                    attachment.loadSignedUrl = "../../xwiki-services/attachments?action=loadfile&space=" + inst["spaceDoc"] + "&name=" + inst["technology"] + "&attachName=" + attachment["sigAttachNameEncoded"];
                });
                attachmentsData["stampUrl"] = "../../xwiki/bin/view/" + inst["spaceDoc"] + "/" + inst["technology"] + "?print=true&stamp=true";
                attachmentsData["mainUrl"] = "../../xwiki/bin/view/" + inst["spaceDoc"] + "/" + inst["technology"] + "?print=true";
                attachmentsData["xwikiUrl"] = "../../xwiki/bin/view/" + inst["spaceDoc"] + "/" + inst["technology"];
                inst.attachmentsData = attachmentsData;
            },
            prepareDocsData: function (attachmentsData, inst) {
                Log.log("AttachmentsModule prepareDocsData");
                inst.attachmentsData = attachmentsData;
            }
        };
        return {
            toggleFiles: function (inst) {
                Log.log("AttachmentsModule toggleFiles");
                if (!AttachmentsDrawModule.filesShown["files" + inst.technology]) {
                    this.showFiles(inst);
                } else {
                    this.hideFiles(inst);
                }
            },
            showFiles: function (inst) {
                Log.log("AttachmentsModule showFiles");
                Ajax.send({
                    url: '../../xwiki-services/attachments',
                    data: {
                        space: inst["spaceDoc"],
                        name: inst["technology"],
                        action: "attachments"
                    },
                    success: function (json) {
                        var data = JsonModule.parse(json);
                        if (data) {
                            local.prepareFilesData(data, inst);
                            AttachmentsDrawModule.drawFiles(inst);
                        }
                    },
                    error: function (xhr) {
                        if (xhr.responseText.indexOf('0002') != '-1') {
                            InstantMessageModule.error(50, xhr.responseText);
                        } else if (xhr.responseText.indexOf('0000') != '-1') {
                            InstantMessageModule.error(48, xhr.responseText);
                        } else if (xhr.responseText.indexOf('0001') != '-1') {
                            InstantMessageModule.error(49, xhr.responseText);
                        } else {
                            InstantMessageModule.error(7, xhr.responseText);
                        }
                    }
                });
            },
            hideFiles: function (inst) {
                Log.log("AttachmentsModule hideFiles");
                AttachmentsDrawModule.hideFiles(inst);
            },
            toggleDocs: function (inst) {
                Log.log("AttachmentsModule toggleDocs");
                if (!AttachmentsDrawModule.docsShown["docs" + inst.technology]) {
                    this.showDocs(inst);
                } else {
                    this.hideDocs(inst);
                }
            },
            showDocs: function (inst) {
                Log.log("AttachmentsModule showDocs");
                Ajax.send({
                    url: '../../xwiki-services/processdocs',
                    data: {
                        tp: inst["technology"],
                        space: inst["spaceDoc"]
                    },
                    success: function (json) {
                        var data = JsonModule.parse(json).data;
                        if (data) {
                            local.prepareDocsData(data, inst);
                            AttachmentsDrawModule.drawDocs(inst);
                        }
                    },
                    error: function (xhr) {
                        InstantMessageModule.error(7, xhr.responseText);
                    }
                });
            },
            hideDocs: function (inst) {
                Log.log("AttachmentsModule hideDocs");
                AttachmentsDrawModule.hideDocs(inst);
            },
            updateFiles: function (inst) {
                Log.log("AttachmentsModule updateFiles");
                if (AttachmentsDrawModule.filesShown["files" + inst.technology]) {
                    this.showFiles(inst);
                }
            },
            openXWiki: function (inst) {
                Log.log("AttachmentsModule openXWiki");
                AttachmentsDrawModule.openXWiki(inst);
            }
        }
    });

    $app.module("AttachmentsDrawModule", function (TplLoader, Log) {
        var local = {
            draw: function (type, inst, success) {
                var tplName = type,
                    self = this;
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    var replace = !!self[type + inst.technology],
                        attachments = $.tmpl(tplName, inst.attachmentsData);
                    if (replace) {
                        Log.log("AttachmentsDrawModule replacing attachments");
                        self[type + inst.technology].replaceWith(attachments);
                    } else {
                        Log.log("AttachmentsDrawModule inserting attachments");
                        $("body").append(attachments);
                    }
                    self[type + inst.technology] = attachments;
                    success.call(self);
                });
            },
            hide: function (type, inst, success, fail) {
                var attachments = this[type + inst.technology];
                if (attachments && attachments.remove) {
                    attachments.remove();
                    delete this[type + inst.technology];
                    success.call(this);

                } else {
                    fail.call(this);
                }
            },
            linkTypes: {
                "true": "Свернуть",
                "false": "Открыть"
            }
        };
        return {
            filesShown: {},
            docsShown: {},
            drawFiles: function (inst) {
                Log.log("AttachmentsDrawModule starting drawFiles");
                var self = this,
                    type = "files";
                local.draw.call(self, type, inst, function () {
                    self.filesShown[type + inst.technology] = true;
                    Log.log("AttachmentsDrawModule finished drawFiles");
                    $app.controller("AttachedFilesController").resources({
                        context: self[type + inst.technology],
                        inst: inst
                    }).exec();
                });
            },
            hideFiles: function (inst) {
                var self = this,
                    type = "files";
                local.hide.call(self, type, inst,
                    function () {
                        self.filesShown[type + inst.technology] = false;
                        Log.log("AttachmentsDrawModule finished hideFiles");
                    },
                    function () {
                        Log.warn("AttachmentsDrawModule trying to hideFiles while files are " + self[type + inst.technology]);
                    });
            },
            drawDocs: function (inst) {
                Log.log("AttachmentsDrawModule starting drawDocs");
                var self = this,
                    tplName = "docsList",
                    type = "docs";
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    local.draw.call(self, type, inst, function () {
                        self.docsShown[type + inst.technology] = true;
                        Log.log("AttachmentsDrawModule finished drawDocs");
                        $app.controller("AttachedDocsController").resources({
                            context: self[type + inst.technology],
                            inst: inst
                        }).exec();
                    });
                });
            },
            hideDocs: function (inst) {
                var self = this,
                    type = "docs";
                local.hide.call(self, type, inst,
                    function () {
                        self.docsShown[type + inst.technology] = false;
                        Log.log("AttachmentsDrawModule finished hideDocs");
                    },
                    function () {
                        Log.warn("AttachmentsDrawModule trying to hideDocs while docs are " + self[type + inst.technology]);
                    });
            },
            openXWiki: function (inst) {
                var tplName = "openXWikiForm";
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    var params = [];
                    _.each(inst.technology.methodParams, function (value, key) {
                        params.push({
                            key: key,
                            value: value
                        });
                    });
                    var attachments = $.tmpl(tplName, {
                            action: "/xwiki" + inst.technology.url,
                            method: inst.technology.method || "GET",
                            params: params
                        }),
                        openXWikiFormContainer = $("#openXWikiFormContainer");
                    if (!openXWikiFormContainer.length) {
                        openXWikiFormContainer = $('<div id="openXWikiFormContainer"></div>').appendTo($("body"));
                    }
                    Log.log("AttachmentsDrawModule inserting attachments");
                    $(attachments).appendTo(openXWikiFormContainer).submit();
                });
            }
        }
    });

    $app.controller("AttachedFilesController", function (Log, AttachmentsFeedbackModule, SignModule, SignPluginsModule, MessageModule, Ajax, InstantMessageModule, context, inst) {
        Log.log("AttachedFilesController started");
        inst.message = MessageModule.create(context);
        inst.message.help("<ul class='ul_help'><li>Чтобы подписать файл, нажмите <b>Подписать</b> напротив соответствующего файла,</li><li> Для предварительного просмотра подписываемого файла нажмите на название файла.</li><li>Если требуется просмотреть ранее подписанные файлы или проверить подлинность ЭП, перейдите во вкладку <b>Подписанные</b>.</li><li>Cсылки для скачивания: <a href='/xwiki-services/attachments?action=loadIFCPlugin'> Плагин портала гос.услуг для Windows x32</a> или <a href='/xwiki-services/attachments?action=loadIFCPlugin64'>Плагин портала гос.услуг для Windows x64</a></li><li>Внимание! После установки Плагина портала гос.услуг необходимо перезагрузить браузер.</li></ul>");

        if (inst.onStartStatus) {
            inst.message.info("", "", inst.onStartStatus);
            inst.onStartStatus = "";
        }
        Ajax.start("AttachedFilesControllerLoading", function () {
            inst.message.startLoading();
        });
        Ajax.stop("AttachedFilesControllerLoading", function () {
            inst.message.stopLoading();
        });
        new atoll.View({
            context: context,
            controller: {
                init: function () {
                    Log.log("AttachedFilesController init");
                    $('.tab-content').focus();
                    SignPluginsModule.preLoad(["firebreath", "csp"]);
                },
                deleteFile: function (target) {
                    if (confirm("Файл будет удален безвозвратно, продолжить?")) {
                        Log.log("AttachedFilesController deleteFile");
                        var fileName = ($(target).data() || {}).name;
                        Ajax.send({
                            url: '../../xwiki-services/attachments',
                            type: "POST",
                            data: {
                                action: 'deleteattachment',
                                filename: fileName,
                                space: inst["spaceDoc"],
                                name: inst["technology"]
                            },
                            success: function () {
                                inst.onStartStatus = "Файл удален";
                                AttachmentsFeedbackModule.callUpdate(inst);
                            },
                            error: function () {
                                InstantMessageModule.error(20);
                            }
                        });
                    }
                },
                fileUpload: function () {
                    Log.log("AttachedFilesController fileUpload");
                    var collection = this;
                    var fileNewName = this.fileUpload.val().split('\\').pop();
                    if (fileNewName.match(/\.sig$|\.signed\.xml$|^soap\.|\.xml$/ig)) {
                        inst.message.instant(103, "", "warn");
                        collection.fileUpload.replaceWith(collection.fileUpload = collection.fileUpload.clone(true));
                        return;
                    }
                    var fileUploadToServer = function (url) {
                        $$f({
                            formid: "formAddNew",
                            url: url,
                            type: "POST",
                            onstart: function () {
                                collection.fileBar.css({display: 'inline-block'});
                                setTimeout(function () {
                                    collection.fileBar.css({'width': '100%'});
                                }, 0);
                                collection.buttonBar.hide();
                                inst.message.info("", "", 100);
                            },
                            onsend: function (responseDoc) {
                                var response = responseDoc && responseDoc.body && responseDoc.body.innerHTML;
                                if (response && response.match(/HTTP Status/)) {
                                    if (response.match(/HTTP Status 500 - 0003/)) {
                                        InstantMessageModule.error(51, response);
                                        inst.message.info("", "", "");
                                    } else {
                                        InstantMessageModule.error(17, $(response).text());
                                    }
                                    collection.fileBar.css({display: '', width: ''});
                                    collection.buttonBar.show();
                                    AttachmentsFeedbackModule.callUpdate(inst);
                                } else {
                                    $('.tab-content').focus();
                                    inst.onStartStatus = "Файл добавлен";
                                    AttachmentsFeedbackModule.callUpdate(inst);
                                }
                            }
                        });
                    };
                    var url = "../../xwiki-services/attachments?space=" + inst["spaceDoc"] + "&name=" + inst["technology"];
                    var oldFile;
                    _.each($('.file-link'), function (fileLink) {
                        var fileLinkText = $(fileLink).text().trim();
                        if (fileLinkText.toUpperCase() == fileNewName.toUpperCase()) {
                            oldFile = fileLinkText;
                            return false;
                        }
                        return true;
                    });
                    if (oldFile) {
                        if (confirm("Файл с таким названием уже существует. Заменить?")) {
                            url = "../../xwiki-services/attachments?space=" + inst["spaceDoc"] + "&name=" + inst["technology"] + "&oldname=" + oldFile;
                            inst.message.info("", "", "");
                            fileUploadToServer(url);
                        } else {
                            inst.message.info("", "", "");
                            inst.onStartStatus = "";
                            AttachmentsFeedbackModule.callUpdate(inst);
                        }
                    } else {
                        fileUploadToServer(url);
                    }
                },
                fileSign: function (target) {
                    Log.log("AttachedFilesController fileSign start");
                    var fileName = ($(target).data() || {}).name;
                    SignModule.sign(inst, fileName, this.blockFiles, this.blockSign);

                },
                fileReSign: function (target) {
                    Log.log("AttachedFilesController fileSign start");
                    var fileName = ($(target).data() || {}).name;
                    inst.activeTabSigned = true;
                    SignModule.sign(inst, fileName, this.blockFiles, this.blockSign);
                },
                fileCheckSign: function (target) {
                    Log.log("AttachedFilesController fileCheckSign start");
                    target = $(target);
                    var fileName = (target.data() || {})["name"];
                    var fileSigName = (target.data() || {})["signame"];
                    SignModule.validate(inst, fileSigName, fileName, target);
                },
                callClose: function () {
                    inst.message.reset();
                    AttachmentsFeedbackModule.callClose(inst);
                },
                tabShown: function (target) {
                    var id = $(target).attr("id");
                    if (id == "idtabsSign") {
                        this.attachmentsInfo.removeClass("hidden");
                        this.signedInfo.addClass("hidden");
                    } else {
                        this.signedInfo.removeClass("hidden");
                        this.attachmentsInfo.addClass("hidden");
                    }
                }
            },
            controls: {
                blockFiles: {
                    selector: ".tab-content-main"
                },
                blockSign: {
                    selector: ".tab-content-signform"
                },
                fileUpload: {
                    selector: "#fileUpload",
                    handlers: {
                        change: "fileUpload"
                    }
                },
                fileLinks: {
                    selector: ".file-link"
                },
                fileSign: {
                    selector: ".sign-file",
                    handlers: {
                        click: "fileSign"
                    }
                },
                fileReSign: {
                    selector: ".resign-file",
                    handlers: {
                        click: "fileReSign"
                    }
                },
                fileCheckSign: {
                    selector: ".check-sign",
                    handlers: {
                        click: "fileCheckSign"
                    }
                },
                fileBar: {
                    selector: ".files-progress"
                },
                buttonBar: {
                    selector: ".fileupload-button-bar"
                },
                fileDelete: {
                    selector: ".delete-file",
                    handlers: {
                        click: "deleteFile"
                    }
                },
                closeButton: {
                    selector: ".attachments-dialog-close",
                    handlers: {
                        click: "callClose"
                    }
                },
                tabs: {
                    selector: ".attachments-dialog-content-tab",
                    handlers: {
                        shown: "tabShown"
                    }
                },
                attachmentsInfo: {
                    selector: ".count-text-attachments"
                },
                signedInfo: {
                    selector: ".count-text-signed"
                }
            },
            handlers: {
                init: "init"
            }
        });
    });

    $app.controller("AttachedDocsController", function (Log, AttachmentsFeedbackModule, context, inst) {
        Log.log("AttachedDocsController started");
        new atoll.View({
            context: context,
            controller: {
                plusMinusClick: function (target) {
                    var plusMinus = $(target);
                    plusMinus.parent(".all-docs-doc").toggleClass('all-docs-doc-expanded').innerHTML = '-';
                },
                callClose: function () {
                    AttachmentsFeedbackModule.callClose(inst);
                }
            },
            controls: {
                plusMinus: {
                    selector: ".plus-minus",
                    handlers: {
                        click: "plusMinusClick"
                    }
                },
                closeButton: {
                    selector: ".attachments-dialog-close",
                    handlers: {
                        click: "callClose"
                    }
                }
            }
        });
    });

    $app.module("AttachmentsFeedbackModule", function (Log) {
        return {
            callUpdate: function (inst) {
                Log.log("AttachmentsFeedbackModule callUpdate");
                inst.callbacks["update"](inst);
            },
            callClose: function (inst) {
                Log.log("AttachmentsFeedbackModule callClose");
                inst.callbacks["close"](inst);
            }
        }
    });

    $app.module("SignModule", function (Log, Ajax, SignDrawModule, JsonModule, SignValidateModule, SignPluginsModule, Location, InstantMessageModule) {
        var signInfoMap = {};
        signInfoMap["xmlsig"] = {signType: "xmlsig", appletClass: "org.pgg.dsig.xml.SignApplet", appletJar: "XMLApplet.jar"};
        signInfoMap["soap"] = {signType: "wssec", appletClass: "org.pgg.dsig.tech.SignApplet", appletJar: "TechApplet.jar" };
        signInfoMap["pkcs7"] = {signType: "pkcs7", appletClass: "org.pgg.dsig.p7.SignApplet", appletJar: "P7Applet.jar"};
        var base = Location.base();
        var local = {
            prepareSignParams: function (inst, fileName, success) {
                var fileUrl = "../../xwiki-services/attachments?action=loadfileview&space=" + inst["spaceDoc"] + "&name=" + inst["technology"] + "&attachName=" + encodeURIComponent(fileName);
                var ext = "pkcs7";
                if (fileName.indexOf(".xmlsig.xml") != -1 || fileName.indexOf(".xmlsig.signed.xml") != -1) {
                    ext = "xmlsig";
                } else if (fileName.indexOf("soap.") == 0 && fileName.indexOf(".xml") != -1) {
                    ext = "soap";
                }

                var id = local.getId(fileName);

                this.getDataForSign(_.extend(signInfoMap[ext], inst, {fileName: fileName, ext: ext, fileUrl: fileUrl, id: id}), success);
            },
            getDataForSignParams: function (signParams) {
                var result;
                if (signParams["ext"] == "pkcs7") {
                    result = {
                        url: base + "xwiki-services/sec/getDSIGKey",
                        data: {
                            space: signParams["spaceDoc"],
                            name: signParams["technology"],
                            file_name: signParams["fileName"]
                        }
                    };
                } else {
                    result = {
                        url: base + "xwiki-services/TransformServlet",
                        data: {
                            space: signParams["spaceDoc"],
                            name: signParams["technology"],
                            file: signParams["fileName"],
                            type: signParams["signType"],
                            id: this.getId(signParams["fileName"])
                        }
                    };
                }
                return result;
            },
            getDataForSign: function (signParams, success) {
                var self = this;
                var active = SignPluginsModule.active;
                var signWithPlugin = function () {
                    active = SignPluginsModule.active;

                    signParams["plugin"] = active;
                    signParams["version"] = SignPluginsModule.call("version");

                    if (active && (active == "csp" || (active == "firebreath" && SignPluginsModule.call("version") != "2.0.5.7"))) {
                        InstantMessageModule.error("При подписании используется 'Плагин портала гос.услуг' устаревшей версии. Необходимо скачать и установить актуальную версию: <a href='/xwiki-services/attachments?action=loadIFCPlugin'> Плагин портала гос.услуг для Windows x32</a> или <a href='/xwiki-services/attachments?action=loadIFCPlugin64'>Плагин портала гос.услуг для Windows x64</a><br/><br/>Внимание! После установки Плагина портала гос.услуг необходимо перезагрузить браузер.");
                        return;
                    }

                    Ajax.send(_.extend(self.getDataForSignParams(signParams), {
                            success: function (json) {
                                if (signParams["ext"] == "pkcs7") {
                                    signParams["dataForSing"] = json;
                                } else {
                                    var data = JsonModule.parse(json);
                                    if (data) {
                                        signParams["dataForSing"] = data["dsignInfo"];
                                    }
                                }
                                success(signParams);
                            },
                            error: function (xhr) {
                                InstantMessageModule.error(3, xhr.responseText);
                            }
                        }
                    ));
                };
                if (SignPluginsModule.activated) {
                    signWithPlugin();
                } else {
                    signParams.message.info("", "", "Загружается плагин JCP");
                    signParams.message.startLoading();
                    SignPluginsModule.load("jcp",
                        function () {
                            signParams.message.info("", "", "");
                            signParams.message.stopLoading();
                            signWithPlugin();
                        },
                        function () {
                            signParams.message.info("", "", "");
                            signParams.message.stopLoading();
                            InstantMessageModule.error("Не удалось задействовать плагины подписания");
                        });
                }
            },
            getId: function (fileName) {    //формирование id
                var id = fileName.substring(0, fileName.indexOf(".")).toLowerCase();
                if (id == "fns") {
                    id = "fns-AppData";
                } else {
                    id = "";
                }
                return id;
            }
        };
        return {
            sign: function (inst, fileName, blockFiles, blockSign) {
                Log.log("SignModule sign");

                local.prepareSignParams(inst, fileName, function (signParams) {
                    SignDrawModule.drawSignForm(signParams, blockFiles, blockSign);
                });
            },
            validate: function (inst, fileSigName, fileName, target) {
                Log.log("SignModule validate");
                var id = local.getId(fileSigName);
                SignValidateModule.toggleValidateArea(inst, fileSigName, fileName, id, target);
            }
        }
    });

    $app.module("Location", function (Log) {
        return {
            base: function () {
                if (!this._base) {
                    this._base = location.href.replace(/^(.*\/\/[^/]+).*/, "$1/");
                }
                Log.log("Location base: \"" + this._base + "\"");
                return this._base;
            }
        }
    });

    $app.module("SignDrawModule", function (TplLoader, AttachmentsFeedbackModule, Log) {
        var local = {
            draw: function (type, signParams, success) {
                var tplName = type;
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    var signForm = $.tmpl(tplName, [signParams]);
                    success(signForm);
                });
            }
        };
        return {
            drawSignForm: function (signParams, blockFiles, blockSign) {
                Log.log("SignDrawModule starting drawSignForm");
                var self = this;
                local.draw.call(self, "dialog", signParams, function (signForm) {
                    var context = signForm.appendTo(blockSign.empty());
                    blockFiles.addClass('hidden');
                    blockSign.removeClass('hidden');
                    var dialog = $(".attachments-dialog");
                    dialog.addClass('hidden');
                    setTimeout(function () {
                        dialog.removeClass('hidden');
                    }, 0);

                    Log.log("SignDrawModule finished drawSignForm");
                    signParams.blocks = {
                        blockFiles: blockFiles,
                        blockSign: blockSign
                    };
                    $app.controller("SignFormController").resources({
                        context: context,
                        signParams: signParams
                    }).exec();
                });
            },
            hideSignForm: function (signParams) {
                AttachmentsFeedbackModule.callUpdate(signParams);
                signParams.blocks.blockSign.addClass('hidden');
                Log.log("SignDrawModule finished hideSignForm");
            }
        }
    });

    $app.controller("SignFormController", function (SignPluginsModule, InstantMessageModule, SignModule, AttachmentsFeedbackModule, PostSignFilesModule, SignDrawModule, TplLoader, Log, Ajax, KeyListDrawModule, context, signParams) {
        Log.log("SignFormController started");
        var certs = [];

        var getSystemDate = function (success) {
            Log.log("getSystemTime  started");
            Ajax.send({
                    url: '../console/sir30/userContextService/getServerTime',
                    success: function (response) {
                        Log.log("getSystemTime  success");
                        if (success) success(new Date(response.data["date"]));
                    },
                    error: function (xhr) {
                        Log.log("getSystemTime  error");
                        InstantMessageModule.error(21, xhr.responseText);
                    }
                }
            );
        };

        function parseKeyList(keyList, dateSystem) {
            var certsUnSort = _.map(keyList, function (key) {
                var keyArray = key.split('::'),
                    dateFromAll = new Date(keyArray[7]),
                    mouthFrom = dateFromAll.getMonth(),
                    dateToAll = new Date(keyArray[8]),
                    rus = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
                    mouthTo = dateToAll.getMonth(),
                    dateFrom = new Date(keyArray[7]),
                    dateTo = new Date(keyArray[8]);
                keyArray[9] = (dateSystem >= dateTo) || (dateSystem <= dateFrom);
                keyArray[7] = dateFromAll.getDate() + " " + rus[mouthFrom] + " " + dateFromAll.getFullYear();
                keyArray[8] = dateToAll.getDate() + " " + rus[mouthTo] + " " + dateToAll.getFullYear();
                return {fio: keyArray[2], uz: keyArray[3], uid: keyArray[1], numToken: keyArray[0], containerId: keyArray[4], hidePassword: !!keyArray[5], isFire: keyArray[6], from: keyArray[7], to: keyArray[8], outdated: keyArray[9], certInfo: keyArray[10]};
            });
            certs = _.sortBy(certsUnSort, "outdated");
            return {certs: certs};
        }

        new atoll.View({
            context: context,
            controller: {
                init: function () {
                    Log.log("SignFormController init");
                    var collection = this;
                    if (SignPluginsModule.active) {
                        try {
                            Log.debug('pluginName', SignPluginsModule.active);
                            var keyList = SignPluginsModule.call("getKeyList");
                        }
                        catch (e) {
                            InstantMessageModule.error(16);
                        }
                        if (keyList) {
                            getSystemDate(function (date) {
                                KeyListDrawModule.draw(parseKeyList(keyList, date), collection.certs);
                            });
                        } else {
                            InstantMessageModule.error(16);
                        }
                    }
                },
                closeSignArea: function () {
                    SignDrawModule.hideSignForm(signParams);
                },
                activateCert: function (target) {
                    var $target = $(target);
                    var certLate = !!$target.has('.cert-is-late').length;
                    if (certLate) return;
                    this.activeCert().removeClass('cert-selected');
                    $target.addClass('cert-selected');

                    target.scrollIntoView(false);
                    target.focus();
                },
                signProcess: function () {
                    var activeCert = this.activeCert(),
                        index = this.cert().index(activeCert),
                        certData = certs[index],
                        activePass = this.activePass(),
                        password = "";
                    if (activePass.length == 1) {
                        password = this.activePass().val();
                        if (!password) {
                            InstantMessageModule.error("Введен неправильный пароль");
                            return;
                        }
                    }
                    if (!activeCert.length) {
                        InstantMessageModule.error(8);
                        return;
                    }
                    var pluginSpecial = {};
                    if (SignPluginsModule.pluginName == "csp") {
                        pluginSpecial.fileApplet = this.fileApplet().get(0).getFileName();
                    }
                    SignPluginsModule.call("sign", signParams, password, certData, pluginSpecial);
                }
            },
            controls: {
                certs: {
                    selector: ".CertsInfoArea"
                }

            },
            dynamics: {
                cert: {
                    selector: ".cert",
                    handlers: {
                        click: "activateCert"
                    }
                },
                fileApplet: {
                    selector: "applet"
                },
                activePass: {
                    selector: ".cert-selected .passwortInput"
                },
                activeCert: {
                    selector: ".cert-selected"
                },
                signButton: {
                    selector: ".buttonSign",
                    handlers: {
                        click: "signProcess"
                    }
                },
                errorFrame: {
                    selector: '#errorMessageFrame'
                },
                errortarget: {
                    selector: "#error"
                },
                backButton: {
                    selector: ".closeButton",
                    handlers: {
                        click: "closeSignArea"
                    }
                }
            },
            handlers: {
                init: "init"
            }
        });
    });

    $app.module("PostSignFilesModule", function (Ajax, SignDrawModule, InstantMessageModule, Log) {
        var local = {
            ajaxParams: function (signParams, certData) {
                Log.log("PostSignFilesModule ajaxParams begin");
                if (signParams["ext"] == "pkcs7") {
                    return {
                        url: "../../xwiki-services/sec/SaveFileServlet" +
                            "?space=" + encodeURIComponent(signParams['spaceDoc']) +
                            "&name=" + encodeURIComponent(signParams['technology']) +
                            "&fio=" + encodeURIComponent(certData['fio']) +
                            "&uz=" + encodeURIComponent(certData['uz']) +
                            "&file=" + encodeURIComponent(signParams['fileName']) + ".sig",
                        type: "POST",
                        processData: false,
                        contentType: "application/octet-stream",
                        data: "----- BEGIN PKCS7 SIGNED -----\n" + signParams['sig'] + "\n----- END PKCS7 SIGNED -----"
                    }
                } else {
                    return {
                        url: "../../xwiki-services/TransformServlet",
                        type: "POST",
                        data: {
                            space: signParams['spaceDoc'],
                            name: signParams['technology'],
                            file: signParams['fileName'],
                            file_new: signParams['fileName'].replace(new RegExp(".xml$"), ".signed.xml"),
                            type: signParams['signType'],
                            id: signParams['id'],
                            cert: certData['certInfo'],
                            signature: signParams['sig'],
                            data: signParams['dataForSing'],
                            fio: certData['fio'],
                            uz: certData['uz']
                        }
                    }
                }
            }
        };
        return {
            post: function (signParams, certData, success) {
                Log.log("PostSignFilesModule  post begin");
                Log.debug("PostSignFilesModule signParams", signParams);
                Ajax.send(_.extend(local.ajaxParams(signParams, certData), {
                    success: function () {
                        signParams.onStartStatus = "Файл подписан";
                        Log.log("PostSignFilesModule success send");
                        signParams.activeTabSigned = true;
                        SignDrawModule.hideSignForm(signParams);
                        if (success) success();
                        signParams.message.info("", "", 12);
                    },
                    error: function (xhr) {
                        InstantMessageModule.error(5, xhr.responseText);
                    }
                }));
            }
        }
    });

    $app.module("SignValidateModule", function (Ajax, SignValidateDrawModule, InstantMessageModule, Log) {
        var local = {
            prepareValidateData: function (signParams, fileSigName, fileName, id) {
                Log.log("SignValidateModule prepareValidateData begin");
                var ext = "pkcs7";
                if (fileSigName.indexOf(".xmlsig.xml") != -1 || fileSigName.indexOf(".xmlsig.signed.xml") != -1) {
                    ext = "xmlsig";
                } else if (fileSigName.indexOf("soap.") == 0 && fileSigName.indexOf(".xml") != -1) {
                    ext = "wssec";
                }
                return {
                    url: "../../xwiki-services/sec/ValidateServlet",
                    data: {
                        space: signParams["spaceDoc"],
                        name: signParams["technology"],
                        file: (ext == "pkcs7") ? fileName : fileSigName,
                        type: ext,
                        id: id,
                        file_sig: fileSigName
                    }
                }
            }
        };
        return {
            toggleValidateArea: function (signParams, fileSigName, fileSign, id, target) {
                Log.log("SignValidateModule toggleValidateArea");
                if (!target.hasClass("blocked") && (!SignValidateDrawModule.current || !SignValidateDrawModule.current.hasClass("blocked"))) {
                    if (target.hasClass("validated")) {
                        this.hideValidateArea(target);
                        SignValidateDrawModule.current = null;
                    } else {
                        if (SignValidateDrawModule.current) {
                            this.hideValidateArea(SignValidateDrawModule.current);
                        }
                        target.addClass("blocked");
                        this.showValidateArea(signParams, fileSigName, fileSign, id, target);
                        SignValidateDrawModule.current = target;
                    }
                }
            },
            showValidateArea: function (signParams, fileSigName, fileSign, id, target) {
                Log.log("SignValidateModule showValidateArea");
                Ajax.send(_.extend(local.prepareValidateData(signParams, fileSigName, fileSign, id), {
                    success: function (data) {
                        SignValidateDrawModule.drawSignArea(data, target);
                        target.addClass("validated").removeClass("blocked").text("Свернуть результат");
                        Log.log("SignValidateModule success send" + data);
                    },
                    error: function (xhr) {
                        target.removeClass("blocked");
                        InstantMessageModule.error(7, xhr.responseText);
                    }
                }));
            },
            hideValidateArea: function (target) {
                Log.log("SignValidateModule hideValidateArea");
                SignValidateDrawModule.hideSignArea(target.removeClass("validated").text("Проверить подпись"));
            }
        }
    });

    $app.module("SignValidateDrawModule", function (TplLoader, Log) {
        var local = {
            draw: function (target, data, success) {
                var tplName = "validate",
                    self = this;
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    var dataparse = eval("(" + data + ")");
                    var attachments = ($.tmpl("validate", {
                        message: dataparse.msg,
                        status: dataparse.success
                    }));
                    Log.log("SignDrawSignValidateModule has drown");
                    var testator = target.parents("tr:first");
                    attachments.addClass(testator.attr("class")).insertAfter(testator);
                    success.call(self);
                });
            },
            hide: function (target, success) {
                var testator = target.parents("tr:first");
                testator.next().remove();
                success.call(this);
            }
        };
        return {
            drawSignArea: function (data, target) {
                Log.log("SignDrawSignValidateModule starting drawSignArea");
                var self = this;
                local.draw.call(self, target, data, function () {
                    Log.log("SignDrawSignValidateModule finished drawSignArea");
                });
            },
            hideSignArea: function (target) {
                var self = this;
                local.hide.call(self, target,
                    function () {
                        Log.log("SignDrawSignValidateModule finished hideSignArea");
                    });
            }
        }
    });

    $app.module("KeyListDrawModule", function (TplLoader, Log) {
        return {
            draw: function (signParams, target) {
                Log.log("KeyListDrawModule starting draw");
                var tplName = "keylist";
                TplLoader.get(tplName, function (template) {
                    $.template(tplName, template);
                    var list = $.tmpl(tplName, signParams);
                    target.html(list);
                    Log.log("KeyListDrawModule finished draw");
                });
            }
        }
    });

    $app.module("ErrorHandler", function () {
        var errorView = new atoll.View({
            controls: {
                dialog: {
                    selector: ".error-dialog"
                }
            },
            controller: {
                appendErrorDialog: function () {
                    $("body").append("<div class='error-dialog'></div>")
                }
            },
            handlers: {
                preinit: "appendErrorDialog"
            }
        });
        return {
            show: function (message) {
                errorView.collection.dialog.text(message);
            }
        }
    });

    $app.module("KeyModule", function (Log) {
        var handlers = {};
        new atoll.View({
            handlers: {
                keydown: "keydown"
            },
            controller: {
                keydown: function () {
                    var code = arguments[1].which,
                        elements = handlers[code];
                    if (elements) {
                        _.each(elements, function (elem) {
                            elem.handler.apply(window, elem.arguments);
                        });
                    }
                }
            }
        });
        return {
            bind: function (code, id, handler) {
                var elem = {
                    handler: handler,
                    arguments: _.rest(arguments, 3)
                };
                if (!handlers[code]) {
                    handlers[code] = {};
                }
                if (handlers[code][id]) {
                    Log.warn("KeyModule replacing handler \"" + id + "\" for key " + code);
                } else {
                    Log.log("KeyModule binding handler \"" + id + "\" for key " + code);
                }
                handlers[code][id] = elem;
            },
            unbind: function (code, id) {
                if (!handlers[code]) {
                    Log.warn("KeyModule trying unbind, while handlers for \"" + code + "\" are not defined");
                    return false;
                }
                if (!handlers[code][id]) {
                    Log.warn("KeyModule trying unbind, while handler \"" + id + "\" for key " + code + " is undefined");
                    return false;
                }
                Log.log("KeyModule unbind handler \"" + id + "\" for key " + code);
                return true;
            }
        }
    });

    $app.module("InstantMessageModule", function (Log, TplLoader, KeyModule) {
        var messages = {
                info: [],
                warn: [],
                errors: []
            },
            messagesTplName = "messages",
            messagesTplLoaded = false,
            messagesMap = errorMap;
        TplLoader.get(messagesTplName, function (template) {
            $.template(messagesTplName, template);
            messagesTplLoaded = true;
            drawMessages();
        });
        (function () {
            $("body").prepend('<div class="instant-message"></div>');
        })();
        var messagesView = new atoll.View({
            context: $(".instant-message"),
            dynamics: {
                close: {
                    selector: ".close",
                    handlers: {
                        click: "closeClick"
                    }
                },
                textLink: {
                    selector: ".message-warning-link",
                    handlers: {
                        click: "showText"
                    }
                },
                selectText: {
                    selector: ".message-warning-text-selector",
                    handlers: {
                        click: "selectText"
                    }
                },
                alerts: {
                    selector: ".alert"
                }
            },
            controller: {
                closeClick: function (target) {
                    $(".attachments-message-shadow").addClass("hidden");
                    $(target).parent().remove();
                    drawMessages();

                },
                showText: function (link) {
                    link = $(link);
                    link.next(".message-warning-text-container").removeClass("hidden");
                    link.remove();
                },
                selectText: function (button) {
                    $(button).next(".message-warning-text").range([0]);
                }
            }
        });
        var drawMessages = function () {
            if (messagesTplLoaded && (messages.info.length + messages.warn.length + messages.errors.length)) {
                Log.log("InstantMessageModule drawMessages");
                var data = {},
                    count = 5 - messagesView.collection.alerts().length;
                if (count < 1) return;
                var draw = function (dataToDraw) {
                    messagesView.options.context.append($.tmpl(messagesTplName, dataToDraw));
                };
                data.errors = messages.errors.splice(0, count);
                count -= data.errors.length;
                if (count < 1) {
                    draw(data);
                    return;
                }
                data.warn = messages.warn.splice(0, count);
                count -= data.warn.length;
                if (count < 1) {
                    draw(data);
                    return;
                }
                data.info = messages.info.splice(0, count);
                draw(data);
            }

        };
        var addMessage = function (title, text, type) {
            Log.log("InstantMessageModule addMessage " + type);
            if (_.isNumber(title)) {
                title = messagesMap[title];
            }
            if (title) {
                if (text) {
                    if (text.match(/(<body(?:\r|\n|\r\n|\n\r|.)*<\/body>)/)) {
                        text = $(RegExp.$1).text();
                    }
                }
                messages[type].splice(0, 0, {title: title, text: text});
                messages[type] = messages[type].slice(0, 5);
                drawMessages();
            }
        };
        KeyModule.bind(27, "InstantMessageModuleHide", function () {
            $(".attachments-message-shadow").addClass("hidden");
            messagesView.collection.alerts().first().remove();
            drawMessages();
        });
        return {
            info: function () {
                addMessage(arguments[0], arguments[1], "info");
            },
            warn: function () {
                addMessage(arguments[0], arguments[1], "warn");
            },
            error: function () {
                addMessage(arguments[0], arguments[1], "errors");
            }
        };
    });

    $app.module("MessageModule", function (Log, TplLoader, KeyModule) {
        var hide = function () {
        };
        var messages = {
            info: [],
            warn: [],
            errors: [],
            help: []
        };
        var resetMessages = function () {
            _.each(messages, function (messagesByType, type) {
                messages[type] = [];
            });
        };
        var create = function (context) {
            messages.help = [];
            var messagesMap = errorMap;
            var paneTplName = "messagesPane",
                messagesTplName = "messages",
                paneTplLoaded = false,
                messagesTplLoaded = false;
            var statusTypes = {
                info: "success",
                warn: "warning",
                errors: "error"
            };
            var paneView, messagesView;
            var startViews = function () {
                paneView = new atoll.View({
                    context: context,
                    controls: {
                        pane: {
                            selector: ".messages-pane"
                        },
                        statusType: {
                            selector: ".sign-status .control-group"
                        },
                        statusText: {
                            selector: ".sign-status .help-inline"
                        },
                        statusContainer: {
                            selector: ".sign-status"
                        },
                        indicator: {
                            selector: ".ajax-loading-icon"
                        }
                    },
                    dynamics: {
                        info: {
                            selector: ".messages-pane-info",
                            handlers: {
                                click: "infoClick"
                            }
                        },
                        warn: {
                            selector: ".messages-pane-warn",
                            handlers: {
                                click: "warnClick"
                            }
                        },
                        errors: {
                            selector: ".messages-pane-errors",
                            handlers: {
                                click: "errorsClick"
                            }
                        },
                        help: {
                            selector: ".messages-pane-help",
                            handlers: {
                                click: "helpClick"
                            }
                        }
                    },
                    controller: {
                        infoClick: function () {
                            drawMessages("info");
                        },
                        warnClick: function () {
                            drawMessages("warn");
                        },
                        errorsClick: function () {
                            drawMessages("errors");
                        },
                        helpClick: function () {
                            drawMessages("help");
                        }
                    }
                });
                messagesView = new atoll.View({
                    context: context.find(".message"),
                    dynamics: {
                        close: {
                            selector: ".close",
                            handlers: {
                                click: "closeClick"
                            }
                        },
                        textLink: {
                            selector: ".message-warning-link",
                            handlers: {
                                click: "showText"
                            }
                        },
                        selectText: {
                            selector: ".message-warning-text-selector",
                            handlers: {
                                click: "selectText"
                            }
                        },
                        alerts: {
                            selector: ".alert"
                        }
                    },
                    controller: {
                        closeClick: function (target) {
                            $(target).parent().remove();
                            $(".attachments-message-shadow").addClass("hidden");
                        },
                        showText: function (link) {
                            link = $(link);
                            link.next(".message-warning-text-container").removeClass("hidden");
                            link.remove();
                        },
                        selectText: function (button) {
                            $(button).next(".message-warning-text").range([0]);
                        }
                    }
                });
            };
            var drawMessagesPane = function () {
                if (paneTplLoaded) {
                    Log.log("MessageModule drawMessagesPane");
                    paneView.collection.pane.html($.tmpl(paneTplName, messages));
                }
            };
            var drawMessages = function (type) {
                if (messagesTplLoaded) {
                    Log.log("MessageModule drawMessages " + type);
                    var data = {};
                    data[type] = type != "help" ? messages[type].splice(0, 5) : messages[type];
                    messagesView.options.context.html($.tmpl(messagesTplName, data));
                    drawMessagesPane();
                }
            };
            var drawInstantMessage = function (title, text, type) {
                if (messagesTplLoaded) {
                    if (_.isNumber(title)) {
                        title = messagesMap[title];
                    }
                    if (title) {
                        if (text) {
                            if (text.match(/(<body(?:\r|\n|\r\n|\n\r|.)*<\/body>)/)) {
                                text = $(RegExp.$1).text();
                            }
                        }
                        Log.log("MessageModule drawInstantMessage " + type);
                        var data = {};
                        data[type] = [
                            {title: title, text: text}
                        ];
                        messagesView.options.context.html($.tmpl(messagesTplName, data));
                    }
                }
            };
            var statusTimeout,
                statusTimeoutValue = 8000;
            var addMessage = function (title, text, status, type) {
                Log.log("MessageModule addMessage " + type);
                if (_.isNumber(title)) {
                    title = messagesMap[title];
                }
                if (title) {
                    if (text) {
                        if (text.match(/(<body(?:\r|\n|\r\n|\n\r|.)*<\/body>)/)) {
                            text = $(RegExp.$1).text();
                        }
                    }
                    messages[type].splice(0, 0, {title: title, text: text});
                    messages[type] = messages[type].slice(0, 99);
                    drawMessagesPane();
                }
                if (status !== undefined) {
                    if (_.isNumber(status)) {
                        status = messagesMap[status];
                    }
                    clearTimeout(statusTimeout);
                    var container = paneView.collection.statusContainer;
                    paneView.collection.statusType.attr("class", "control-group " + statusTypes[type]);
                    paneView.collection.statusText.text(status);
                    if (status == "") {
                        container.animate({opacity: 0}, 500);
                    } else {
                        container.animate({opacity: 1}, 500);
                        statusTimeout = setTimeout(function () {
                            container.animate({opacity: 0}, 500);
                        }, statusTimeoutValue);
                    }
                }
            };
            var prepareTemplates = function () {
                Log.log("MessageModule prepareTemplates");
                TplLoader.get(paneTplName, function (template) {
                    $.template(paneTplName, template);
                    paneTplLoaded = true;
                    drawMessagesPane();
                });
                TplLoader.get(messagesTplName, function (template) {
                    $.template(messagesTplName, template);
                    messagesTplLoaded = true;
                });
            };
            startViews();
            prepareTemplates();
            hide = function () {
                messagesView.collection.alerts().first().remove();
            };
            return {
                info: function () {
                    addMessage(arguments[0], arguments[1], arguments[2], "info");
                },
                warn: function () {
                    addMessage(arguments[0], arguments[1], arguments[2], "warn");
                },
                error: function () {
                    addMessage(arguments[0], arguments[1], arguments[2], "errors");
                },
                instant: function () {
                    drawInstantMessage(arguments[0], arguments[1], arguments[2]);
                },
                help: function () {
                    addMessage(arguments[0], "", "", "help");
                },
                startLoading: function () {
                    paneView.collection.indicator.removeClass("hidden");
                },
                stopLoading: function () {
                    paneView.collection.indicator.addClass("hidden");
                },
                reset: function () {
                    resetMessages();
                }
            };
        };
        KeyModule.bind(27, "MessageModuleHide", function () {
            hide();
        });
        return {
            create: function (context) {
                return create(context);
            }
        }
    });

    $(function () {
        $("body").on('mousewheel', ".localScroll", function (event) {
            if (!event || !event.originalEvent) return true;
            var e = event.originalEvent,
                d = e["deltaY"];
            if ((d > 0 && this.clientHeight + this.scrollTop == this.scrollHeight) ||
                (d < 0 && this.scrollTop == 0)) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            }
            return true;
        });
    });

})(window["$x"]);
