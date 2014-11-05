function Log($config) {
    var placebo = function () {
    };
    var show = !!$config.show;
    this._debug = !!$config.debug;
    this._console = (show && window.console) || {
        info: placebo,
        log: placebo,
        warn: placebo,
        error: placebo
    };
}

_.extend(Log.prototype, {
    log: function (message) {
        this._console.log(message);
    },
    warn: function (message) {
        this._console.warn(message);
    },
    error: function (message) {
        this._console.error(message);
    },
    info: function (message) {
        this._console.info(message);
    },
    debug: function () {
        if (this._debug) this._console.info.apply(window, arguments);
    }
});

$app.module("Log", function ($config) {
    return new Log($config);
});