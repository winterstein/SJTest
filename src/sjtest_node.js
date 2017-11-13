/**
 * Provide export for use with npm / node.js
 */
import SJTest, {assert, assMatch, assertMatch} from './sjtest.js';

// EXPORT
if (typeof(module)!=='undefined') {
	module.exports = SJTest;
}
export default SJTest;
export {assert, assMatch, assertMatch};
