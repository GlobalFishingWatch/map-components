import React, { Component, Fragment } from 'react'
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom'
import './App.css'

import Miniglobe from './miniglobe/miniglobe'
import Timebar from './timebar/timebar'

const Home = () => <h1>Please select the component you want to play with</h1>

class App extends Component {
  render() {
    return (
      <Router className="app">
        <Fragment>
          <nav className="nav">
            <NavLink to="/miniglobe">Miniglobe</NavLink>
            <NavLink to="/timebar">Timebar</NavLink>
          </nav>
          <div className="content">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/miniglobe" component={Miniglobe} />
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
