/**
 * The local, in-memory development implementation of $fh.cache. Unlike the $fh.db module, no
 * serialisation is given here... the cache is given for the duration of the local server process.
 *
 * @author Gareth Murphy <gareth.murphy@feedhenry.com>
 */

var cache = {};

/**
 * The facade of this module, which is exposed through $fh.cache.
 *
 * Contract:
 *  - **In:** Options and callback are expected present and to be well formed; no error checking.
 *  - **Out:** When present, `err` is an Error while `res` is always a string.
 *
 * @param {Object} options The options for the cache call.
 * @param {Function} callback The callback to be given an error or result if present.
 */
module.exports = function $fh_cache(options, callback) {

  if (!options.act) {
    return callback(new Error('No callback actions defined!'));
  }

  switch (options.act) {
    case 'save':
      save();
      break;
    case 'load':
      load();
      break;
    case 'remove':
      remove();
      break;
    default:
      return callback(new Error('Unknown cache action: ' + options.act));
  }

  /**
   * Saves the value under the key which was given in the options argument, for the amount of time
   * given in the exist option, or if none given 24 hours by default.
   */
  function save() {
    cache[options.key] = options.value.toString();

    // We check to make sure that there's at least 1 second here.
    if (options.expire && options.expire > 1000) {
      setTimeout(function() {
        delete cache[options.key];
      }, options.expire / 1000)
    } else {
      setTimeout(function() {
        delete cache[options.key];
      }, 86400000);
    }

    return callback(null, 'OK');
  }

  /**
   * Loads a value from the cache under the given key option, or if none exists returns null.
   */
  function load() {
    if (!cache[options.key]) {
      return callback(null, null);
    }
    return callback(null, cache[options.key]);
  }

  /**
   * Removes the given key/value pair from the cache. Returns 1 if item existed and has been deleted
   * or 0 if key didn't exist and therefore no delete was carried out.
   */
  function remove() {
    if (!cache[options.key]) {
      return callback(null, 0);
    }
    delete cache[options.key];
    return callback(null, 1);
  }
};