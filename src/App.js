import React from 'react'
import {
  Badge,
  Button,
  Container,
  Image,
  Row, Col,
  Form
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
      stakeAmount: "",
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
      stakeAmount,
    } = this.state

    const ethBalance = BN(wei).div(1e18).toFixed(4)
    const hexBalance = BN(hearts).div(1e08).toFixed(4)
    const deepLinkAddr =  "cuatrocincos.club"

    const amountChangedHandler = (e) => {
      this.setState({ stakeAmount: BN(e.currentTarget.value).toFixed(4) })
    }

    const percentButtonHandler = (e) => {
      const stakeAmount = BN(e.currentTarget.value).times(hexBalance).div(100).toFixed(4)
      this.hexAmount.value = stakeAmount
      this.setState({ stakeAmount })
    }

    const stakeButtonHandler = (e) => {
      e.preventDefault()

      this.hex.methods.stakeStart("0x"+BN(this.state.stakeAmount).times(1E08).toString(16), 5555)
      .send()
      .then((err, result) => {
        debug(err, result)
      })
      .catch(e => debug("Call to stakeStart FAILED: ", e.message))
    }

    return (
      <ErrorBoundary>
      <Container className="App p-0 text-center" fluid>
        <Row>
          {/* <Col className="col-12 col-sm-6 pr-0 pr-sm-3 d-flex align-content-center"> */}
          <Col className="col-12 d-flex align-content-center">
            <div className="logo">
              <Image src={imgLogo} ref={r => this.imgLogo = r} />
              <Image src={imgLogoStamp} ref={r => this.imgStamp = r} />
            </div>
          </Col>
          <Col className="text-light text-left">
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
                      <Container id="badges" 
                        style={{ height: "fit-content", minHeight: "50vmin" }}
                        className="d-flex align-content-center justify-content-center"
                      >
                        <Container className="m-auto">
                        <p className="text-light text-uppercase"><b>Qualifing Stakes</b></p>
                        <div>{
                          this.state.stakeList
                          .filter(stake => stake.stakedDays === "5555")
                          .map(s => ( <Image key={s.stakeId} src={imgBadge} /> ))
                        }</div>
                        </Container>
                      </Container>
                    </> : <Container className="mx-0 d-raised text-light">

                      <h4 className="mb-3 text-danger text-uppercase">
                        5555 Stake<br/>
                        <span className="blink">Not Found</span>
                      </h4>

                      <h3 className="pt-3">JOIN THE</h3>
                      <h1 className="text-uppercase">Cuatro Cincos Club!</h1>
                      
                      <Form>
                        <Form.Group as={Row}>
                          <Form.Label column="lg" xs={6} className="text-right text-success">
                            HEX<span className="d-none d-sm-inline"> Balance</span>
                          </Form.Label>
                          <Form.Label column="lg" xs={6} className="text-left text-success">{BN(hexBalance).toFixed(4)}</Form.Label>
                        </Form.Group>
                        <Form.Group as={Row} className="justify-content-center" controlId="hexAmount">
                          <Col xs="auto">
                            <Form.Control
                              className="text-center"
                              type="number"
                              step="any"
                              size="lg"
                              htmlSize={20}
                              placeholder="HEX stake amount"
                              ref={r => this.hexAmount = r}
                              onChange={amountChangedHandler}
                            />
                          </Col>
                        </Form.Group>
                        <Form.Row>
                          <Col className="mt-1">
                            <Form.Group className="percent-btns" controlId="amountSelector">
                              <Button variant="danger"  onClick={percentButtonHandler} value="10">10%</Button>
                              <Button variant="warning" onClick={percentButtonHandler} value="25">25%</Button>
                              <Button variant="warning" onClick={percentButtonHandler} value="50">50%</Button>
                              <Button variant="info"    onClick={percentButtonHandler} value="75">75%</Button>
                              <Button variant="success" onClick={percentButtonHandler} value="100">100%</Button>
                            </Form.Group>
                          </Col>
                        </Form.Row>
                        <Form.Row>
                          <Col>
                            <Button variant="primary" disabled={Number(stakeAmount) < 0.0001}
                              className="mx-0 my-3" size="lg" type="button" block
                              value={stakeAmount}
                              onClick={stakeButtonHandler}
                            >
                              Stake {stakeAmount} HEX<br/>for 5555 days!
                            </Button>
                          </Col>
                        </Form.Row>
                      </Form>
                    </Container>}

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
