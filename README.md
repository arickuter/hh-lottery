# hh-lottery

A Hardhat + TypeScript decentralized raffle contract: players enter with ETH and
a verifiably random winner is drawn automatically using **Chainlink VRF** for
randomness and **Chainlink Keepers** for time-based automation.

Course work from Patrick Collins' *Hardhat / Solidity* FreeCodeCamp course
(2022). Archived as a learning milestone.

**Demonstrates:** Chainlink VRF v2 randomness, Keepers/Automation upkeep, event
emission, and full unit + staging test coverage.

> Secrets are read from environment variables (see `.env.sample`); no keys are
> committed.
