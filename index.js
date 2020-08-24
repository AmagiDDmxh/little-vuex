const __DEV__ = true

class Module {
  constructor(rawModule) {
    this._rawModule = rawModule
    this._children = Object.create(null)
    const rawState = rawModule.state
    this.state = typeof rawState === 'function' ? rawState() : rawState
  }

  forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}

class ModuleCollection {
  constructor(rawRootModule) {
    this.register(rawRootModule)
  }

  register (rawModule) {
    const newModule = new Module(rawModule)
    this.root = newModule
  }
}

class Store {
  constructor(options = {}) {
    this._modules = new ModuleCollection(options)
    this._committing = false
    this._mutations = Object.create(null)

    this.state = this._modules.root.state

    installModule(this, this._modules.root)
  }

  commit (_type, _payload, _options) {
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const entry = this._mutations[type]
    if (!entry) {
      if (__DEV__) {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })
  }

  _withCommit(fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}

function installModule(store, module) {
  const local = module.context = makeLocalContext(store)
  module.forEachMutation(
    (mutation, key) => registerMutation(store, key, mutation, local)
  )
}

function makeLocalContext(store) {
  const local = {
    dispatch: store.dispatch,
    commit: store.commit
  }

  Object.defineProperties(local, {
    getters: { get: () => store.getters },
    state: { get: () => store.state }
  })

  return local
}

function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}

const isObject = obj => obj !== null && typeof obj === 'object'

function unifyObjectStyle(type, payload, options) {
  if (isObject(type) && type.type) {
    options = payload
    payload = type
    type = type.type
  }

  return { type, payload, options }
}

const forEachValue = (obj, fn) => Object.keys(obj).forEach(key => fn(obj[key], key))


// use
const state = {
  count: 0
}

const mutations = {
  increment(state) {
    state.count++
  },
  decrement(state) {
    state.count--
  }
}

const store = new Store({ state, mutations })

store.commit('increment')

console.log(store, store.state.count)
