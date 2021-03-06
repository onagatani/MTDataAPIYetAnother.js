/**
 * MTDataAPIYetAnother.js - Yet another MT DataAPI SDK using jQuery
 *
 * SYNOPSIS
 *
 * var api = new MT.MTDataAPIYetAnother({
 *     baseUrl:"http://192.168.56.101:5000/mt-data-api.cgi",
 *     enableJsonp:false
 * });
 * 
 * api.listCategoryStats(siteId, function(json){...});
 * 
 * @param $ jQuery object
 */
;(function($) {
    
    /**
     * Default params
     */
    var default_params = {
        baseUrl: undefined,
        enableJsonp: true,
        internalLimit: 1000
    };
    
    /**
     * Constructor
     * @param {Object} params that overrides the default
     */
    var Class = function(params) {
        this.params = $.extend(default_params, params, {});
    };
    
    /**
     * Emulation of official SDK's API with JSONP support
     * @param {Number} siteId Site ID
     * @param {Number} entryId
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.getEntry = function(siteId, entryId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/entries/" + entryId;
        var query = {
            fields: params.fields
        };
        
        return this.getJSON(path, query, function(data) {
            cb && cb(data);
        });
    };
    
    /**
     * Emulation of official SDK's API with JSONP support
     * @param {Number} siteId Site ID
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.listEntries = function(siteId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/entries";
        
        return this.getJSON(path, params, function(data) {
            cb && cb(data);
        });
    };
    
    /**
     * Category list with numbers of entries
     * TODO Better implement as server side endpoint for it.
     * @param {Number} siteId Site ID
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.listCategoryStats = function(siteId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var api = this;
        
        return api.listCategories(siteId, {fields:'basename,label'}, function(data) {
            
            var dfd = $.Deferred();
            var deferredObjects = [];
            
            for (var idx in data.items) {
                var name = data.items[idx].label;
                var path = "/v1/sites/1/entries";
                var query = {
                    category: name,
                    fields: 'DUMMY', // it works for now
                    limit: api.internalLimit
                };
                var xhr = api.getJSON(path, query);
                deferredObjects.push(xhr);
            }
            
            $.when.apply(null, deferredObjects).done(function() {
                var items = Array.prototype.slice.call(arguments, 0).map(
                                                                function(v, i) {
                    return {
                        totalResults: v[0].totalResults,
                        basename: data.items[i].basename,
                        label: data.items[i].label
                    };
                });
                var stat = {
                    totalResults: items.length,
                    items: items
                };
                dfd.resolve();
                cb && cb(stat);
            });
            
            return dfd.promise();
        });
    };
    
    /**
     * Category list
     * @param {Number} siteId Site ID
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.listCategories = function(siteId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/categories";
        
        return this.getJSON(path, params, function(data) {
            cb && cb(data);
        });
    };
    
    /**
     * Tag list
     * TODO Better implement as server side endpoint for it.
     * @param {Number} siteId Site ID
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.listTags = function(siteId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/entries";
        var query = {
            fields: 'tags',
            date_type: 'authored_on',
            after: yyyymmdd(monthAgo(params.monthLimit || 5)),
            limit: this.internalLimit
        };
        
        return this.getJSON(path, query, function(data) {
            var total = {};
            for (var idx in data.items) {
                var tags = data.items[idx].tags;
                for (var idx2 in data.items[idx].tags) {
                    var name = data.items[idx].tags[idx2];
                    total[name] = total[name] || 0;
                    total[name]++;
                }
            }
            var items = Object.keys(total).map(function(k) {
                return {
                    name: k,
                    totalResults: total[k]
                };
            });
            setRanks(items, (params.maxRank || 6));
            var stat = {
                totalResults: items.length,
                items: items
            };
            cb && cb(stat);
        });
    };
    
    /**
     * Month list with numbers of entries
     * TODO Better implement as server side endpoint for it.
     * @param {Number} siteId Site ID
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.listMonthlyEntryCounts = function(siteId, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/entries";
        var query = {
            fields: 'date',
            date_type: 'authored_on',
            after: yyyymmdd(monthAgo(params.monthLimit - 1)),
            limit: this.internalLimit
        };
        
        return this.getJSON(path, query, function(data) {
            var total = {};
            for (var idx in data.items) {
                var ym = data.items[idx].date.substr(0, 7);
                total[ym] = total[ym] || 0;
                total[ym]++;
            }
            var items = Object.keys(total).map(function(k) {
                return {
                    year: parseInt(k.substr(0, 4)),
                    month: parseInt(k.substr(5, 2)),
                    totalResults: total[k]
                };
            });
            var stat = {
                totalResults: items.length,
                items: items
            };
            cb && cb(stat);
        });
    };
    
    /**
     * Number of entries for given month
     * @param {Number} siteId Site ID
     * @param {Number} year year like 2014
     * @param {Number} month month number of 1 to 12
     * @param {Object} params Additional Parameters(optional)
     * @param {Function} cb callback(optional)
     * @return {jqXhr}
     */
    Class.prototype.monthlyEntryCount = function(siteId, year, month, params, cb) {
        
        var opts = dispatchOptionalArgs(params, cb);
        params = opts[0];
        cb = opts[1];
        
        var path = "/v1/sites/" + siteId + "/entries";
        var query = {
            fields: 'DUMMY', // it works for now
            date_type: 'authored_on',
            from: yyyymmdd(new Date(year, month - 1, 1)),
            to: yyyymmdd(new Date(year, month, 0)),
            limit: this.internalLimit
        };
        
        return this.getJSON(path, query, function(data) {
            cb && cb(data.totalResults);
        });
    };
    
    /**
     * JSON request
     * @param {String} path Path to access
     * @param {Object} opt options
     * @param {Function} cb callback
     * @return {jqXhr}
     */
    Class.prototype.getJSON = function(path, opt, cb) {
        
        var query = $.param(opt);
        
        return $.ajax({
            type: 'GET',
            url: this.params.baseUrl + path + (query ? "?" + query : ""),
            dataType: this.params.enableJsonp ? 'jsonp' : 'json',
            success: function(data) {
                cb && cb(data);
            }
        });
    };
    
    window.MT = window.MT || {};
    window.MT.MTDataAPIYetAnother = window.MT.MTDataAPIYetAnother || Class;
    
    /**
     * Optional Parameters dispacher
     * @param {Object} params callers optional parameter(optional)
     * @param {Function} cb callers optional callback(optional)
     * @return {Array} parameters and a callback with fallback value
     */
    function dispatchOptionalArgs(params, cb) {
        if (typeof(params) === "function") {
            cb = params;
        }
        if (typeof(params) !== 'object') {
            params = [];
        }
        return [params, cb];
    }
    
    /**
     * Date formatter for DataAPIExtendSearch plugin API
     * @param {Date} d Source date object
     * @return {Object}
     */
    function yyyymmdd(d) {
        return [
            d.getFullYear(),
            ('0' + (d.getMonth() + 1)).slice(-2),
            ('0' + d.getDate()).slice(-2)
        ].join('-');
    }
    
    /**
     * Generate month interval by number of months
     * @param {Number} offset Offset Number of months
     * @return {Date}
     */
    function monthAgo(offset) {
        var today = new Date();
        var y = today.getFullYear();
        var m = today.getMonth();
        var yearPast = y + Math.floor((m - offset) / 12);
        var monthPast = (m - offset) % 12;
        while (monthPast < 0) {
            monthPast += 12;
        }
        return new Date(yearPast, monthPast, 1);
    }
    
    /**
     * Set tag cloud ranks for each entries
     * @param {Object} items Entry items
     * @param {Number} maxRank Max number for rank
     * @return void
     */
    function setRanks(items, maxRank) {
        var nums = items.map(function(i) {
            return i.totalResults;
        });
        maxRank--;
        
        var maxNum = Math.max.apply(null, nums);
        var minNum = Math.min.apply(null, nums);
        
        if (maxNum === minNum) {
            items.map(function(i) {
                i.rank = parseInt(maxRank / 2);
            });
            return;
        }
        
        var sqrtMax = Math.sqrt(maxNum);
        var sqrtMin = Math.sqrt(minNum);
        var sqrtDiff = sqrtMax - sqrtMin;
        items.map(function(i) {
            var sqrt = Math.sqrt(i.totalResults);
            i.rank = parseInt((sqrt - sqrtMin) / sqrtDiff * maxRank + 0.5) + 1;
        });
    }
    
})(jQuery);
