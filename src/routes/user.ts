import * as Koa from 'koa';
import { get, post, middlewares, querystring } from '../utils/route-decors';
import userModel from '../model/user';
// 数据校验中间件
const api = {
    findByName(name) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (name === 'david') {
                    reject('用户名已经存在')
                } else {
                    resolve()
                }
            }, 1000)
        })
    }
}

// 增加类级别路由守卫-中间件
// @ts-ignore
@middlewares([
    async function guard(ctx: Koa.Context, next: () => Promise<any>) {
        console.log('guard', ctx.header);
        if (ctx.header.token) {
            await next();
        } else {
            throw "请登录";
        }
    }
])
export default class User {
    @get('/users')
    // localhost:3000/users?age=aaa  500 
    @querystring({
        age: { type: 'int', required: false, max: 200, convertType: 'int' },
    })
    public async list(ctx: Koa.Context) {
        const users = await userModel.findAll()
        ctx.body = { ok: 1, data: users };
    }
    @post('/users', {
        middlewares: [
            async function validation(ctx: Koa.Context, next: () => Promise<any>) {
                // 用户名必填
                const name = ctx.request.body.name;
                if (!name) {
                    throw "请输入用户名";
                }
                // 用户名不能重复
                try {
                    await api.findByName(name);
                    // 校验通过
                    await next();
                } catch (error) {
                    throw error;
                }
            }
        ]
    })
    public add(ctx: Koa.Context) {
        // {id: 1, name: 'david'}
        userModel.create(ctx.request.body)
        ctx.body = { ok: 1 }
    }
}