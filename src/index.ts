interface Env {
	WOOPLY_STATUS: KVNamespace;
}


class Activity {
	project: string;
	envs: string[];
	type: string;
	state: string;

	constructor(project: string, envs: string[], type: string, state: string) {
		this.project = project;
		this.envs = envs;
		this.type = type;
		this.state = state;
	}

	key(environment: string) {
		return `${this.project}-${environment}`;
	}

	down(env: Env) {
		this.envs.forEach(async environment => {
			console.log(this.key(environment), "0");
			await env.WOOPLY_STATUS.delete(this.key(environment));
			await env.WOOPLY_STATUS.put(this.key(environment), "0");
		});
	}

	up(env: Env) {
		this.envs.forEach(async environment => {
			console.log(this.key(environment), "1");
			await env.WOOPLY_STATUS.delete(this.key(environment));
			await env.WOOPLY_STATUS.put(this.key(environment), "1");
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'POST') {
			return this.postUpdate(request, env, ctx);
		} else if (request.method === 'GET') {
			return this.fetchStatus(request, env, ctx);
		} else {
			return new Response('Method not allowed', { status: 405 });
		}
	},

	async postUpdate(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const data = await request.json();

		const pending_activities = [
			'environment.operation',
			'environment.push',
			'environment.redeploy',
			'environment.source-operation',
			'environment.domain.create',
			'environment.domain.delete',
			'environment.domain.update',
			'environment.restore',
			'environment.synchronize',
			'environment.variable.create',
			'environment.variable.delete',
			'environment.variable.update'
		]
		const nok_activities = [
			'environment.deactivate',
			'environment.delete',
			'environment.pause'
		]
		const ok_activities = [
			'environment.initialize',
			'environment.resume'
		]

		try {
			let activity = new Activity(data.project, data.environments, data.type, data.state);
			let new_state = null;

			if (pending_activities.includes(activity.type)) {
				if (activity.state === 'in_progress') {
					activity.down(env);
					new_state = 0;
				}
				if (activity.state === 'completed' || activity.state === 'cancelled') {
					activity.up(env);
					new_state = 1;
				}
			}

			if (nok_activities.includes(activity.type)) {
				if (activity.state === 'completed') {
					activity.down(env);
					new_state = 0;
				}
			}

			if (ok_activities.includes(activity.type)) {
				if (activity.state === 'completed') {
					activity.up(env);
					new_state = 1;
				}
			}

			let r = {
				"project": activity.project,
				"environments": activity.envs,
				"state": new_state
			}

			return new Response(JSON.stringify(r), { status: 200 });
		} catch (error) {
			return new Response('Failed to update', { status: 500 });
		}
	},

	async fetchStatus(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const project = url.searchParams.get('project');
		const environment = url.searchParams.get('env');

		if (project && environment) {
			try {
				const status = await env.WOOPLY_STATUS.get(project + '-' + environment);
				if (status !== null) {
					return new Response('{"status": ' + status + '}', { status: 200 });
				} else {
					return new Response('Environment not found', { status: 404 });
				}
			} catch (error) {
				return new Response('Failed to retrieve environment status', { status: 500 });
			}
		} else {
			return new Response('Missing project or environment parameter', { status: 400 });
		}
	},
};
