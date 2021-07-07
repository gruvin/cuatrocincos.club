
function _Web3SendTester() {
    const self = _Web3SendTester
    self.state = "init"
    self.counter = 0
    self.subscribers = {}

    self.setState = function (newState) {
        self.state = newState
        const fn = self.subscribers[self.state]
        const callback = typeof fn === 'function'
        if (self.state === "sent") window.setTimeout(() => self.setState("transactionHash"), 600)
        else if (self.state === "transactionHash") {
            callback && fn("0x0000....0000")
            window.setTimeout(() => { self.setState("confirmation") }, 3000)
        }
        else if (self.state === "confirmation") {
            callback && fn(self.counter)

            if (++self.counter < 24) window.__W3T_CT = window.setTimeout(() => { self.setState("confirmation") }, 1000)
            else window.setTimeout(() => { self.setState("error") }, 1000)
        }
        else if (self.state === "error") {
            window.clearTimeout(window.__W3T_CT)
            const error = { error: 369, message: "ERROR: dummy test error" }
            if (callback) fn(error); else throw new Error(error)
        }
    }
    self.send = () => { self.setState("sent"); return self; }
    self.on = (eventName, fn) => { self.subscribers[eventName] = fn; return self; }
    self.then = (fn) => { fn(); return self; }
    self.catch = (fn) => { self.subscribers.error = fn; return self; }
    return self
}

export default _Web3SendTester