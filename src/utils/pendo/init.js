
import { PENDO_MANGO_APP_ID } from './constants'

const appId = PENDO_MANGO_APP_ID;

function pendoInit(publicAppId) {
    (function (p, e, n, d, o) {
        var v, w, x, y, z; o = p[d] = p[d] || {}; o._q = o._q || [];
        v = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track', 'trackAgent']; for (w = 0, x = v.length; w < x; ++w)(function (m) {
            o[m] = o[m] || function () { o._q[m === v[0] ? 'unshift' : 'push']([m].concat([].slice.call(arguments, 0))); };
        })(v[w]);
        y = e.createElement(n); y.async = !0; y.src = 'https://cdn.pendo-mango.pendo-dev.com/agent/static/' + publicAppId + '/pendo.js';
        z = e.getElementsByTagName(n)[0]; z.parentNode.insertBefore(y, z);
    })(window, document, 'script', 'pendo');
}
pendoInit(appId)