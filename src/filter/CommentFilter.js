/** 
 * Comment Filters Module Simplified
 * @license MIT
 * @author Jim Chen
 */
var CommentFilter = (function () {

    /**
     * Matches a rule against an input that could be the full or a subset of 
     * the comment data.
     *
     * @param rule - rule object to match
     * @param cmtData - full or portion of comment data
     * @return boolean indicator of match
     */
    function _match (rule, cmtData) {
        var path = rule.subject.split('.');
        var extracted = cmtData;
        while (path.length > 0) {
            var item = path.shift();
            if (item === '') {
                continue;
            }
            if (extracted.hasOwnProperty(item)) {
                extracted = extracted[item];
            }
            if (extracted === null || typeof extracted === 'undefined') {
                extracted = null;
                break;
            }
        }
        if (extracted === null) {
            // Null precondition implies anything
            return true;
        }
        switch (rule.op) {
            case '<':
                return extracted < rule.value;
            case '>':
                return extracted > rule.value;
            case '~':
            case 'regexp':
                return (new RegExp(rule.value)).test(extracted.toString());
            case '=':
            case 'eq':
                return rule.value ===
                    ((typeof extracted === 'number') ? 
                        extracted : extracted.toString());
            case 'NOT':
                return !_match(rule.value, extracted);
            case 'AND':
                if (Array.isArray(rule.value)) {
                    return rule.value.every(function (r) {
                        return _match(r, extracted);
                    });
                } else {
                    return false;
                }
            case 'OR':
                if (Array.isArray(rule.value)) {
                    return rule.value.some(function (r) {
                        return _match(r, extracted);
                    });
                } else {
                    return false;
                }
            default:
                return false;
        }
    }

    function CommentFilter() {
        this.rules = [];
        this.modifiers = [];
        this.allowUnknownTypes = true;
        this.allowTypes = {
            '1': true,
            '2': true,
            '4': true,
            '5': true,
            '6': true,
            '7': true,
            '8': true,
            '17': true
        };
    }

    /**
     * Runs all modifiers against current comment
     *
     * @param cmt - comment to run modifiers on
     * @return modified comment
     */
    CommentFilter.prototype.doModify = function (cmt) {
        return this.modifiers.reduce(function (c, f) {
            return f(c);
        }, cmt);
    };

    /**
     * Executes a method defined to be executed right before the comment object
     * (built from commentData) is placed onto the runline.
     * 
     * @deprecated
     * @param cmt - comment data
     * @return cmt
     */
    CommentFilter.prototype.beforeSend = function (cmt) {
        return cmt;
    };

    /**
     * Performs validation of the comment data before it is allowed to get sent
     *
     * @param cmtData - comment data
     */
    CommentFilter.prototype.doValidate = function (cmtData) {
        if ((!this.allowUnknownTypes || 
                cmtData.mode.toString() in this.allowTypes) &&
            !this.allowTypes[cmtData.mode.toString()]) {
            return false;
        }
        return this.rules.every(function (rule) {
            // Decide if matched
            try {
              var matched = _match(rule, cmtData);
            } catch (e) {
              var matched = false;
            }
            return rule.mode === 'accept' ? matched : !matched;
        });
    };

    CommentFilter.prototype.addRule = function (rule) {
        if (rule.mode !== 'accept' && rule.mode !== 'reject') {
            throw new Error('Rule must be of accept type or reject type.');
        }
        this.rules.push(rule);
    };

    CommentFilter.prototype.addModifier = function (f) {
        if (typeof f !== 'function') {
            throw new Error('Modifiers need to be functions.');
        }
        this.modifiers.push(f);
    };

    return CommentFilter;
})();
