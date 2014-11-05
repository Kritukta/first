$app.module("TplLoader", function (Ajax, Log) {
    function TplLoader (_path, _extension) {
        this._path = _path;
        this._extension = _extension;
        this._cache = {};
    }

    _.extend(TplLoader.prototype, {
        get: function (name, success) {
            var fromCache = this._cache[name];
            if (fromCache) {
                Log.log("TplLoader module success. Template \"" + name + "\" loaded from cache.");
                success.call(window, fromCache);
                //TODO: вернуть deferred
//                var deferred = jQuery.Deferred();
//                return deferred.resolve();
                return true;
            }
            return this._load(name, success);
        },
        _load: function (name, success) {
            var self = this;
            return Ajax.send({
                url: this._path + name + this._extension,
                success: function (data) {
                    self._cache[name] = data;
                    Log.log("TplLoader module success. Template \"" + name + "\" loaded from server.");
                    success.call(window, data);
                }
            })
        }
    });
    return new TplLoader("../formSign/js/templates/", ".html");
});