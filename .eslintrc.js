const DISABLED = 0
const WARN = 1
const ERROR = 2

module.exports = exports = {
    extends: 'streamr-nodejs',
    env: {
        jest: true,
    },
    rules: {
        'max-len': [WARN, {
            code: 150
        }],
        'max-classes-per-file': DISABLED,
        'no-param-reassign': DISABLED
    }
}
