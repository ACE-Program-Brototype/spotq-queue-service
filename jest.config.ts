import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.(t|j)sx?$': '@swc/jest',
	},
};

export default config;
