import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/test/setup.ts'],
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
		'^@di/(.*)\\.(ts|js)$': '<rootDir>/src/di/$1',
		'^@di/(.*)$': '<rootDir>/src/di/$1',
		'^@shared/(.*)\\.(ts|js)$': '<rootDir>/src/shared/$1',
		'^@shared/(.*)$': '<rootDir>/src/shared/$1',
		'^@types/(.*)\\.(ts|js)$': '<rootDir>/src/types/$1',
		'^@types/(.*)$': '<rootDir>/src/types/$1',
		'^@/(.*)\\.(ts|js)$': '<rootDir>/src/$1',
		'^@/(.*)$': '<rootDir>/src/$1',
		'^(\\.{1,2}/.*)\\.ts$': '$1',
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	transform: {
		'^.+\\.(t|j)sx?$': [
			'@swc/jest',
			{
				jsc: {
					parser: {
						syntax: 'typescript',
						decorators: true,
						dynamicImport: true,
					},
					transform: {
						legacyDecorator: true,
						decoratorMetadata: true,
					},
					target: 'es2022',
				},
				module: {
					type: 'es6',
				},
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!.*(inversify|@inversifyjs))'],
};

export default config;
