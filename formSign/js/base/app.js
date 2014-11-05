(function ($) {
    $(function () {
        window._ready = true;
    });

    function Root(name, func, executor) {
        this._name = name;
        this._func = func;
        this._executor = executor;
    }

    _.extend(Root.prototype, {
        exec: function () {
            var self = this;
            if (window._ready) {
                self._executor(self._func, self._name);
            } else {
                $(function () {
                    self._executor(self._func, self._name);
                });
            }
            return this;
        },
        resources: function (obj) {
            this._func["_resources"] = _.extend({}, this._func["_resources"], obj);
            return this;
        }
    });

    function Application() {
        this.modules = {};
        this.controllers = {};
        this._STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        this.debug = false;
        var placebo = function () {
        };
        this._console = window.console || {
            log: placebo,
            warn: placebo,
            error: placebo
        };
        this._currentExecuting = {};
        this._config = {};
    }

    _.extend(Application.prototype, {
        module: function (name, func) {
            if (func) {
                this._log("$app: loading module \"" + name + "\"");
                this._packed(func, true);
                if (this.modules[name]) {
                    this._warn("$app: the old version of module \"" + name + "\" will be replaced");
                }
                this.modules[name] = func;
            } else {
                func = this.modules[name];
            }
            return new Root(name, func, $.proxy(this._execModule, this));
        },
        controller: function (name, func) {
            if (func) {
                this._log("$app: loading controller \"" + name + "\"");
                if (this.modules[name]) {
                    this._warn("$app: the old version of controller \"" + name + "\" will be replaced");
                }
                this.controllers[name] = func;
            } else {
                func = this.controllers[name];
            }
            return new Root(name, func, $.proxy(this._execController, this));
        },
        config: function (configuration) {
            this._config = _.extend(this._config, configuration);
        },
        _getParamNames: function (func) {
            var fnStr = func.toString().replace(this._STRIP_COMMENTS, '');
            var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
            if (result === null)
                result = [];
            return result;
        },
        _exec: function (func, execName) {
            var args = [],
                app = this;
            _.each(this._getParamNames(func), function (name) {
                if (name == "$config") {
                    var config = app._config[execName];
                    if (config) {
                        args.push(config);
                        return true;
                    }
                }
                var resource = (func["_resources"] || {})[name];
                if (resource) {
                    args.push(resource);
                    return true;
                }
                var module = app.modules[name];
                module = app._execModule(module, name);
                args.push(module);
                return true;
            });
            if (this._currentExecuting[execName]) {
                delete this._currentExecuting[execName];
            }
            return func.apply(this, args);
        },
        _execController: function (controller, name) {
            this._log("$app: executing controller \"" + name + "\"");
            this._exec(controller, name);
        },
        _execModule: function (module, name) {
            if (module === undefined) {
                this._warn("$app: module \"" + name + "\" is not available");
            }
            if (!this._packed(module)) return module;
            if (this._currentExecuting[name]) {
                this._error("$app: circular reference on module \"" + name + "\"! Cancelling reference to prevent loops.");
                return undefined;
            }
            this._log("$app: unpacking module \"" + name + "\"");
            this._currentExecuting[name] = true;
            return this.modules[name] = this._exec(module, name);
        },
        _packed: function (module, value) {
            if (value === undefined) {
                return _.isFunction(module) && module.packed;
            }
            return module.packed = value;
        },
        _log: function (message) {
            if (this.debug) this._console.log(message);
        },
        _warn: function (message) {
            if (this.debug) this._console.warn(message);
        },
        _error: function (message) {
            if (this.debug) this._console.error(message);
        }
    });

    window.$app = new Application();

})($x);

(function ($) {

    window.atoll = {};

    function View(options) {
        var defaults = {
            controls: {},
            controller: {},
            context: $("html"),
            handlers: {}
        };
        this.options = _.extend(defaults, options);
        this.controls = {};
        this.dynamics = {};
        this.collection = {};
        this.preinit();
    }

    _.extend(View.prototype, {
        preinit: function () {
            var that = this;
            $(function () {
                that.init();
            });
        },
        init: function () {
            this.listenSelf();
            this.trigger("preinit");
            this.getControls();
            this.getDynamics();
            this.setCollection();
            this.listen();
            this.trigger("init");
        },
        getControls: function () {
            _.each(this.options.controls, $.proxy(this.getControl, this));
        },
        getDynamics: function () {
            _.each(this.options.dynamics, $.proxy(this.getDynamic, this));
        },
        setCollection: function () {
            this.collection = _.extend(this.collection, this.controls, this.dynamics);
        },
        getControl: function (control, name) {
            this.controls[name] = this.select(control.selector);
        },
        getDynamic: function (dynamic, name) {
            var that = this;
            this.dynamics[name] = function () {
                return that.select(dynamic.selector);
            };
        },
        select: function (selector) {
            return $(selector, this.options.context);
        },
        listen: function () {
            _.each(this.options.controls, $.proxy(this.listenControl, this));
            _.each(this.options.dynamics, $.proxy(this.listenDynamic, this));
        },
        listenControl: function (controlOptions, name) {
            var handlers = controlOptions.handlers,
                control = this.controls[name];
            if (handlers) {
                _.each(handlers, $.proxy(this.bindHandler, this, control));
            }
        },
        listenDynamic: function (dynamicOptions) {
            var handlers = dynamicOptions.handlers;
            if (handlers) {
                _.each(handlers, $.proxy(this.declareHandler, this, dynamicOptions.selector));
            }
        },
        listenSelf: function () {
            var handlers = this.options.handlers,
                context = this.options.context;
            if (handlers) {
                _.each(handlers, $.proxy(this.bindHandler, this, context));
            }
        },
        bindHandler: function (object, handler, eventType) {
            var that = this;
            if (object.length > 1) object.each(function () {
                that.bindHandler($(this), handler, eventType);
            });
            else if (this.options.controller && _.isString(handler)) object.on(eventType, $.proxy(this.options.controller[handler], this.collection, object));
        },
        declareHandler: function (selector, handler, eventType) {
            var that = this;
            if (this.options.context && this.options.controller && _.isString(handler)) this.options.context.on(eventType, selector, function () {
                var args = _.toArray(arguments);
                args.unshift(this);
                that.options.controller[handler].apply(that.collection, args);
            });
        },
        trigger: function (eventType) {
            if (this.options.handlers[eventType]) this.options.context.triggerHandler(eventType);
        }
    });

    atoll["View"] = View;

})($x);