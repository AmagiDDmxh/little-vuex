const __DEV__ = true

class Module {
  constructor(rawModule) {
    this._rawModule = rawModule
    this._children = Object.create(null)
    const rawState = rawModule.state
    this.state = typeof rawState === 'function' ? rawState() : rawState
  }

  getChild(key) {
    return this._children[key]
  }

  addChild(key, module) {
    this._children[key] = module
  }

  forEachMutation(fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}

class ModuleCollection {
  constructor(rawRootModule) {
    this.register([], rawRootModule, false)
  }

  get (path) {
    path.reduce(
      (module, key) => module.getChild(key), 
      this.root
    )
  }

  register (path, rawModule, runtime) {
    const newModule = new Module(rawModule)
    this.root = newModule

    /* if (path.length === 0) {
      this.root = newModule
    } else {
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule)
    }

    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    } */
  }
}

const forEachValue = (obj, fn) => Object.keys(obj).forEach(key => fn(obj[key], key))

class Store {
  constructor(options = {}) {
    this._modules = new ModuleCollection(options)
    this._committing = false

    const store = this
    const state = this._modules.root.state

    installModule(store, state, [], this._modules.root)

    // resetStoreVM(this, state)
  }

  commit (_type, _payload, _options) {
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = { type, payload }
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

    // this._subscribers
    //   .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
    //   .forEach(sub => sub(mutation, this.state))

  }

  _withCommit() {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}

function installModule(store, state, path, module, hot) {
  const local = makeLocalContext(store, path)
  module.forEachMutation(
    (mutation, key) => registerMutation(store, key, mutation, local)
  )
}

function makeLocalContext(store, /* path */) {
  const local = {
    dispatch: store.dispatch,
    commit: store.commit
  }

  Object.defineProperties(local, {
    getters: {
      get: () => store.getters
    },
    state: {
      get: () => store.state
    }
  })

  return local
}

const getNestedState = (state, path) => path.reduce((state, key) => state[key], state)

function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}

function resetStoreVM() {

}

function restoreVM() {

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
