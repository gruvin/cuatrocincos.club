import React from 'react'
import {
  Badge,
  Button,
  Container,
  Image,
  Row, Col,
} from 'react-bootstrap'
import './App.scss';
import ErrorBoundary from './ErrorBoundary'
// import Cookies from 'universal-cookie'
import Web3 from 'web3'
import BN from 'bignumber.js'
import HEX from './hex_contract'
import detectEthereumProvider from '@metamask/detect-provider'
import { OnboardingButton } from './MmOnboarding'
import imgLogo from './assets/logo.png'
import imgSpinner from './assets/hex_planet.gif'
const debug = require('debug')('App')

class App extends React.Component {

  constructor(props) {
    super(props)
    this.chainId = null
    this.state = {
      mmOnboard: false,
      contractReady: false,
      stakeCount: 0,
      totalStakedHearts: BN(0),
      totalShares: BN(0),
      inTheClub: false,
    }
  }

  async componentDidMount() {
    if (localStorage && localStorage.getItem("debug")) {
      window._APP = this
      window._BN = BN
    }

    // Is Metamask available?
    const provider = await detectEthereumProvider()
    if (!provider) {
        if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(navigator.userAgent))
            this.setState({ mmOnboard: "mobile" })
        else
            this.setState({ mmOnboard: "desktop" })
        return
    }

    this.chainId = Number(await provider.request({ method: 'eth_chainId' }));
    const accounts = await provider.request({ method: 'eth_requestAccounts' })
    if (!accounts.length) window.location.reload()
    const account = accounts[0]
    
    this.web3 = new Web3(provider)
    if (this.web3.eth.hasOwnProperty('handleRevert')) this.web3.eth.handleRevert = true // ref: https://soliditydeveloper.com/web3-1-2-5-revert-reason-strings

    this.hex = new this.web3.eth.Contract(
        HEX.ABI, 
        HEX.CHAINS[this.chainId].address, 
        { from: account } // default from address
    )
    if (localStorage.getItem("debug")) window._HEX = this.HEX

    this.updateAccount(account)
    provider.on('accountsChanged', this.updateAccount)
    provider.on('chainChanged', () => window.location.reload() )
    provider.on('disconnect', () => window.location.reload() ) // chain's RPC network connection was lost
  }

  async updateAccount(account) {
    try {
      const wei = BN(await window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] }))
      const hearts = BN(await this.hex.methods.balanceOf(account).call())
      const currentDay = await this.hex.methods.currentDay().call()
      const stakeCount = await this.hex.methods.stakeCount(account).call()
      const stakes = []
      for (let index=0; index < stakeCount; index++) 
        stakes[index] = this.hex.methods.stakeLists(account, index).call()
      const stakeList = await Promise.all(stakes)
      //debug("stakeList: ", stakeList)
      let totalStakedHearts = BN(0)
      let totalShares = BN(0)
      let shortestStake = 5555
      let longestStake = 0
      let inTheClub = false
      let numMaxStakes = 0
      stakeList.forEach(stake => {
        const { lockedDay, stakedDays, stakedHearts, stakeShares } = stake
        const stakeActive = (lockedDay + stakedDays) < currentDay
        if (Number(stakedDays) < shortestStake) shortestStake = stakedDays
        if (Number(stakedDays) > longestStake) longestStake = stakedDays
        totalStakedHearts = totalStakedHearts.plus(stakedHearts)
        totalShares = totalShares.plus(stakeShares)
        if (Number(stakedDays) === 5555) {
          numMaxStakes++
          inTheClub = true
        }
      })
      this.setState({
        mmOnboard: false,
        account,
        wei,
        hearts,
        contractReady: true,
        stakeCount,
        stakeList,
        totalStakedHearts,
        totalShares,
        shortestStake,
        longestStake,
        numMaxStakes,
        inTheClub,
      })
      debug(this.state)
    } catch(err) {
      debug("UA ERROR: ", err.message)
      window.location.reload() // user probably locked MM
    }
  }

  render() {
    const {
      mmOnboard,
      account,
      wei,
      hearts,
      contractReady,
      stakeCount,
      // stakeList,
      shortestStake,
      longestStake,
      inTheClub,
      numMaxStakes,
    } = this.state

    const ethBalance = BN(wei).div(1e18).toFixed(4)
    const hexBalance = BN(hearts).div(1e08).toFixed(4)
    const deepLinkAddr =  "cuatrocincos.club"

    return (
      <ErrorBoundary>
      <Container className="App p-0" fluid>
        <Row>
          <Col className="col-12 col-sm-6">
            <Image className={"logo"+(this.state.inTheClub ? " logo-member" : "")} src={imgLogo} />
          </Col>
          <Col className="stats text-light text-left">
            <Container className="p-3">
              {mmOnboard !== false && <>
                <h1>Let's get connected!</h1>
                <p>This dApp requires MetaMask Wallet</p>
                {this.state.mmOnboard === "mobile" && <Container>
                  <Button className="text-uppercase" onClick={e => document.location.href = `https://metamask.app.link/dapp/${deepLinkAddr}`}>
                    Open in MetaMask
                  </Button>
                </Container>}
                {this.state.mmOnboard === "desktop" && <Container>
                  <OnboardingButton style={{ position: "absolute", top: 0, left: 0 }} />
                </Container>}
              </>}
              {mmOnboard === false && <>
                <div className="text-center">
                  {!contractReady && <p>
                    <Image src={imgSpinner} /> Connecting to HEX Smart Contract
                  </p>}
                  {contractReady && <>
                    <Badge variant="secondary">{account}</Badge><br />
                    <Badge variant="primary">{ethBalance} ETH</Badge>
                    &nbsp;
                    <Badge variant="info">{hexBalance} HEX</Badge>
                    <h1 className="mt-3">STATS</h1>
                    <p>Total stakes: {`${stakeCount}`}</p>
                    <p>Shortest: {shortestStake} days</p>
                    <p>Longest: {longestStake} days</p>
                    <p>Number of 5555 stakes: {numMaxStakes}</p>
                    <h2>{inTheClub ? "!! IN DA CLUB <3 :-) !!" : "GTFO n00b! :p"}</h2>
                  </>}
                </div>
              </>}
            </Container>
          </Col>
        </Row>
      </Container>
      </ErrorBoundary>
      )
  }
}

export default App
