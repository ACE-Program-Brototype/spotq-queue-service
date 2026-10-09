import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: {
		'^@domain/(.*)\\.(ts|js)$': '<rootDir>/src/domain/$1',
		'^@domain/(.*)$': '<rootDir>/src/domain/$1',
		'^@application/(.*)\\.(ts|js)$': '<rootDir>/src/application/$1',
		'^@application/(.*)$': '<rootDir>/src/application/$1',
		'^@infrastructure/(.*)\\.(ts|js)$': '<rootDir>/src/infrastructure/$1',
		'^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
		'^@presentation/(.*)\\.(ts|js)$': '<rootDir>/src/presentation/$1',
		'^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
		'^@modules/(.*)\\.(ts|js)$': '<rootDir>/src/modules/$1',
		'^@modules/(.*)$': '<rootDir>/src/modules/$1',
		'^@shared/(.*)\\.(ts|js)$': '<rootDir>/src/shared/$1',
		'^@shared/(.*)$': '<rootDir>/src/shared/$1',
		'^(\\.{1,2}/.*)\\.ts$': '$1',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.(t|j)sx?$': '@swc/jest',
	},
};

export default config;
