import React, { Component, Fragment } from 'react'
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom'
import './App.css'

import MapWorkspace from './map-workspace/map-workspace'
import Timebar from './timebar/timebar'

const Home = () => <h1>Please select the component you want to play with</h1>

class App extends Component {
  render() {
    return (
      <Router className="app">
        <Fragment>
          <nav className="nav">
            <NavLink to="/map">Map</NavLink>
            <NavLink to="/map-workspace">Map+workspace</NavLink>
            <NavLink to="/timebar">Timebar</NavLink>
          </nav>
          <div className="content">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/map-workspace" component={MapWorkspace} />
              <Route path="/timebar" component={Timebar} />
              <Route component={Home} />
            </Switch>
          </div>
        </Fragment>
      </Router>
    )
  }
}

export default App
