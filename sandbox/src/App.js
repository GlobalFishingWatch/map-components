import React, { Component, Fragment } from 'react'
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom'
import './App.css'

import MapPage from './map/map'
import Miniglobe from './miniglobe/miniglobe'
import Timebar from './timebar/timebar'
import CountryFlag from './countryflag/countryflag'

const Home = () => <h1>Please select the component you want to play with</h1>

class App extends Component {
  render() {
    return (
      <Router className="app">
        <Fragment>
          <nav className="nav">
            <NavLink to="/miniglobe">Miniglobe</NavLink>
            <NavLink to="/map">Map</NavLink>
            <NavLink to="/timebar">Timebar</NavLink>
            <NavLink to="/countryflag">CountryFlag</NavLink>
          </nav>
          <div className="content">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/map" component={MapPage} />
              <Route path="/miniglobe" component={Miniglobe} />
              <Route path="/timebar" component={Timebar} />
              <Route path="/countryflag" component={CountryFlag} />
              <Route component={Home} />
            </Switch>
          </div>
        </Fragment>
      </Router>
    )
  }
}

export default App