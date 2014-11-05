(function ($) {
    $app.module("Ajax", function (Log) {
        var handlers = {start: {}, stop: {}};

        (function() {
            var fade = $("<div class='ajax-loading-fade'></div>").appendTo("body"),
                doc = $(document);
            var apply = function (func) {
                return func.apply(window);
            };
            $.ajaxSetup({cache: false});

            doc.ajaxStart(function () {
                fade.show();
                _.each(handlers["start"], apply);
            });
            doc.ajaxStop(function () {
                fade.hide();
                _.each(handlers["stop"], apply);
            });
        })();

        var bind = function (type, id, handler) {
            var handlersByType = handlers[type];
            if (!id) {
                Log.error("Ajax module bind " + type + " handler error: id is \"" + id +"\"");
                return;
            }
            if (!handler) {
                Log.error("Ajax module bind " + type + " handler error: handler is \"" + handler +"\"");
                return;
            }
            if (!_.isFunction(handler)) {
                Log.error("Ajax module bind " + type + " handler error: handler is not a function");
                return;
            }
            if (handlersByType[id]) {
                Log.log("Ajax module replace " + type + " handler: \"" + id + "\"");
            } else {
                Log.log("Ajax module bind " + type + " handler: \"" + id + "\"");
            }
            handlersByType[id] = handler;
        };

        function Ajax() {
        }

        _.extend(Ajax.prototype, {
            send: function (params) {
                params.error = this._errorHandler(params.url, params.error);
                params.success = this._successHandler(params.url, params.success);
                return $.ajax(params);
            },
            start: function () {
                bind("start", arguments[0], arguments[1]);
            },
            stop: function () {
                bind("stop", arguments[0], arguments[1]);
            },
            _errorHandler: function (url, error) {
                return function () {
                    var request = arguments[0] || {};
                    Log.warn("Ajax module error. On \"" + url + "\" server returned " + request.status + " " + request.statusText);
                    if (_.isFunction(error)) {
                        error.apply(this, arguments);
                    }
                }
            },
            _successHandler: function (url, success) {
                return function () {
                    Log.log("Ajax module success: \"" + url + "\"");
                    if (_.isFunction(success)) {
                        success.apply(this, arguments);
                    }
                }
            }
        });
        return new Ajax();
    });
})($x);
