import React from 'react'
import {
  Badge,
  Button,
  Container,
  Image,
  Row, Col,
} from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.scss'
import ErrorBoundary from './ErrorBoundary'
import Web3 from 'web3'
import BN from 'bignumber.js'
import HEX from './hex_contract'
import detectEthereumProvider from '@metamask/detect-provider'
import { OnboardingButton } from './MmOnboarding'
import StakeButton from './StakeButton'

import imgLogo from './assets/logo.png'
import imgLogoStamp from './assets/logo-certified.png'
import imgSpinner from './assets/hex_planet.gif'
import imgBadge from './assets/badge.png'

import { gsap } from "gsap"

const debug = require('debug')('App')

const uriQuery = new URLSearchParams(window.location.search)

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
      showStakeForm: false,
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

  refresh() {
    window.location.reload()
  }

  async updateAccount(account) {
    if (typeof account === 'undefined') account = this.state.account
    gsap.timeline()
      .set(this.imgLogo, { filter: "opacity(0.2) saturate(0)" } )
      .set(this.imgStamp, { delay: 0.69,  filter: "opacity(0) saturate(1)" }, "<")

    try {
      const wei = BN(await window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] }))
      const hearts = BN(await this.hex.methods.balanceOf(account).call())
      // const currentDay = await this.hex.methods.currentDay().call()
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
        const { /*lockedDay,*/ stakedDays, stakedHearts, stakeShares } = stake
        // const stakeActive = (lockedDay + stakedDays) < currentDay
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
      if (inTheClub) {
        gsap.timeline()
        .set(this.imgLogo, { filter: "opacity(1) brightness(1) saturate(1)" } )
        .set(this.imgStamp, { delay: 0.69,  filter: "opacity(1) brightness(1.3) saturate(1)" })
        .to(this.imgStamp, {
          duration: 3,
          filter: "opacity(0.1) brightness(1) saturate(0)",
          ease: "power1.in"
        })
      }
      //debug(this.state)
    } catch(err) {
      debug("updateAccount FAILED: ", err.message)
      window.location.reload() // user most likely locked MM
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
      // stakeAmount,
    } = this.state

    const ethBalance = BN(wei).div(1e18).toFixed(4)
    const hexBalance = BN(hearts).div(1e08).toFixed(4)
    const deepLinkAddr =  "cuatrocincos.club"

    return (
      <ErrorBoundary>
      <Container className="App p-0 text-center" fluid>
        <Row>
          <Col className="col-12 d-flex align-content-center">
            <div className="logo">
              <Image src={imgLogo} ref={r => this.imgLogo = r} />
              <Image src={imgLogoStamp} ref={r => this.imgStamp = r} />
            </div>
          </Col>
          <Col className="text-light text-center">
            <Container className="p-0">
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
                    <Image src={imgSpinner} />&nbsp; Connecting to HEX Smart Contract
                  </p>}
                  {contractReady && <> 

                    {inTheClub ? <>
                      <div style={{ marginTop: "-2.5rem", textShadow: "3px 3px 6px #000000" }}>
                        <span>Hexican Cuatro Cincos Club</span>
                        {!this.state.showStakeForm && <>
                          <div className="text-muted">{account && account.substr(0,6)+"...."+account.substr(-4, 4)}</div>
                          <div className="text-success">{inTheClub && <b>CERTIFIED MEMBER</b>}</div>
                        </>}
                      </div>
                      
                      {!this.state.showStakeForm && <Container id="badges" 
                        className="d-flex align-content-center justify-content-center"
                      >
                        <Container className="pt-3 m-auto">
                        <div>{
                          this.state.stakeList
                          .filter(stake => stake.stakedDays === "5555")
                          .map(s => ( <Image className="cccBadge" key={s.stakeId} src={imgBadge} /> ))
                        }</div>
                        </Container>
                      </Container>}

                    </> : <Container className="mx-0 d-raised text-light">
                      <h4 className="mb-3 text-danger text-uppercase">
                        5555 Stake<br/>
                        <span className="blink">Not Found</span>
                      </h4>

                      <h3 className="pt-3">JOIN THE</h3>
                      <h1 className="text-uppercase">Cuatro Cincos Club!</h1>

                      <StakeButton parent={this} />
                    </Container>}

                    <Container>
                    {!this.state.showStakeForm && inTheClub && <>
                        <div className="mt-3"> </div>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          className="mt-3"
                          onClick={() => this.setState({ showStakeForm: true })}
                        >
                          <strong>EARN ANOTHER BADGE!</strong>
                        </Button>
                      </>}
                      {this.state.showStakeForm && <>
                        <StakeButton parent={this} />
                      </>}
                    </Container>

                    {uriQuery.has('debug') && <Container className="">
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
                    </Container>}
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
