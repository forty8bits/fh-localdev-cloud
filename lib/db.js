/**
 * The local implementation of the $fh.db cloud API, which mimics a single instance (one per app)
 * MongoDB based data store. The database can optionally be made persistent across runs of the local
 * development server by serializing to a JSON file.
 *
 * @author Gareth Murphy <gareth.murphy@feedhenry.com>
 */

var path = require('path'),
    fs = require('fs');

module.exports = (function() {
    'use strict';

    var _memStore = {},
        _file = path.join(process.cwd(), '.fhc_local/db.json'),
        _ready = false;

    /**
     * Returns the given entry if it exists, or undefined if it doesn't; helps prevent duplicated
     * try/catch statements for every item read in the db.
     *
     * @param {String} type The entity within which to search for the item.
     * @param {String} guid The unique GUID reference of the item in question.
     *
     * @returns {Object} The entry or empty object if object couldn't be found.
     */
    function getEntry(type, guid) {
        var entity = _memStore[type],
            item;

        if (!entity) {
            item = {};
        } else {
            item = entity[guid] || {};
        }
        return item;
    }

    function entryExists(type, guid) {
        var entity = _memStore[type],
            item;

        if (!entity) {
            return false;
        } else {
            return !!(entity[guid]);
        }
    }

    (function loadPersisted() {
        fs.readFile(_file, function(err, data) {
            if (err) {
                console.log('[$fh.db] No serialized data to load into db.');
            } else {
                console.log('[$fh.db] Loading serialized data into db.');
                _memStore = JSON.parse(data);
            }
            _ready = true;
        });
    }());

    /**
     * Serializes and saves the current db data in a JSON file. Note this method is kept completely
     * synchronous as it is primarily used on process.exit.
     */
    function persist() {
        try {
            fs.writeFileSync(_file, JSON.stringify(_memStore));
        } catch (err) {
            console.log('[$fh.db] Persisting data failed:');
            console.log(err);
        }
    }

    /**
     * Helper function which generates random numbers which comply with the examples on the FH docs.
     * They're not absolutely guaranteed to be genuinely unique, however it's extremely likely they
     * always will be.
     *
     * @return {String} A GUID string.
     */
    function getGuid() {

        // Generates a 4 digit hex number.
        function S4() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }

        // We never bother checking for duplicates because the impact on performance would be too
        // great compared to the probability of a clash ever arising.
        return (S4()+S4()+S4()+S4()+S4()+S4());
    }

    /**
     * Create an entry, or set of entries, in the in-memory data store.
     *
     * @param {Object} options The options sent with the call to $fh.db.
     * @param {Function} cb The callback given to $fh.db.
     */
    function create(options, cb) {
        var single, i, dataLen, guid, response, entity;

        // TODO: What if the fields is an empty object or array?
        if (!options.type ||
            !options.fields) {
            return cb('You need to provide the required arguments.');
        }

        // We force even a single object into an array, to simplify processing.
        if (!options.fields.length) {
            options.fields = [options.fields];
        }
        single = (options.fields.length === 1);

        _memStore[options.type] = _memStore[options.type] || {};
        entity = _memStore[options.type];

        for (i = 0, dataLen = options.fields.length; i < dataLen; i++) {

            // Create a new GUID until we know it's unique.
            do {
                guid = getGuid();
            } while (_memStore[guid]);

            entity[guid] = {
                fields: options.fields[i],
                guid: guid,
                type: options.type
            };
        }

        response = single ? entity[guid] : {
            Status: 'OK',
            Count: dataLen
        };

        return cb(null, response);
    }

    /**
     * Read a specific entry from the in-memory data store.
     *
     * @param {Object} options The options sent to $fh.db().
     * @param {Function} cb The callback given to $fh.db().
     */
    function read(options, cb) {
        var entry;

        // TODO: What if the fields is an empty object or array?
        if (!options.type ||
            !options.guid) {
            return cb('You need to provide the required arguments.');
        }

        if (!_memStore[options.type]) {
            return cb(new Error('Invalid entity reference, check type value.'));
        }

        entry = _memStore[options.type][options.guid] || {};

        return cb(null, entry);
    }

    /**
     * Update a selected entry in the db (more like 'replace' in reality; all
     * fields are overwritten with new data).
     *
     * @param {Object} options The options sent to $fh.db().
     * @param {Function} cb The callback sent to $fh.db().
     */
    function update(options, cb) {
        var entry;

        // TODO: What if the fields is an empty object or array?
        if (!options.type ||
            !options.guid ||
            !options.fields) {
            return cb(new Error('You need to provide the required arguments.'));
        }

        entry = _memStore[options.type][options.guid] || false;

        if (!entry) {
            return cb(new Error('Object not found, check values.'));
        }

        entry.fields = options.fields;
        return cb(null, entry);
    }

    /**
     * Delete a single item from the database, returning the value of the deleted item.
     */
    function deleteItem(options, cb) {
        // TODO: What if the fields is an empty object or array?
        if (!options.type || !options.guid) {
            return cb(new Error('You need to provide the required arguments.'));
        }

        var item;

        if (!entryExists(options.type, options.guid)) {
            item = {};
        } else {
            item = _memStore[options.type][options.guid];
            delete _memStore[options.type][options.guid];
        }

        // Even though we've deleted the item from the store, because we stored reference to the
        // inner item here, it'll still exist and be fine for us to return.
        return cb(null, item);
    }

    /**
     * List the entries matching a specific query; at the moment only accepts a
     * type as query.
     *
     * @param {Object} options The options passed to $fh.db().
     * @param {Function} cb The callback passed to $fh.db().
     */
    function list(options, cb) {
        var results = [],
            entry, entity;

        if (!options.type || !_memStore[options.type]) {
            return cb(new Error('Invalid or non-existent type value given, can\'t proceed.'));
        }
        entity = _memStore[options.type];

        // TODO: Implement all non-mandatory logic.

        // This will be painfully slow for large sets of data, however our options
        // in JS are limited, and the choice of data storage (in an object) is ideal
        // for the read method; it's a trade-off.
        for (entry in entity) {
            if (entity.hasOwnProperty(entry)) {
                results.push(entity[entry]);
            }
        }

        // TODO: Confirm error behaviour with engineers on this function.
        return cb(null, {
            count: results.length,
            list: results
        });
    }

    return function db(options, cb) {

        // TODO: Implement error checking.
        switch (options.act) {

            // Because we're using returns, we don't need to worry about breaks.
            case 'create':
                return create(options, cb);
            case 'read':
                return read(options, cb);
            case 'update':
                return update(options, cb);
            case 'list':
                return list(options, cb);
            case 'delete':
                return deleteItem(options, cb);
            default:
                return cb('You haven\'t provided a valid act value.');
        }
    };
}());
