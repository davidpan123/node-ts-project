import * as glob from 'glob';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as Parameter from 'parameter'

type HTTPMethod = 'get' | 'put' | 'del' | 'post' | 'patch';
type LoadOptions = {
    /**
    * 路由文件扩展名，默认值是`.{js,ts}`
    */
    extname?: string;
};
type RouteOptions = {
    /**
    * 适用于某个请求比较特殊，需要单独制定前缀的情形
    */
    prefix?: string;
    /**
    * 给当前路由添加一个或多个中间件
    */
    middlewares?: Array<Koa.Middleware>;
};

let router = new KoaRouter();
// 1. 实现get\post
// export const get = (urlPath: string, routerOptions: RouteOptions = {}) => {
//     //装饰器
//     return (target, key: string, describe: any) => {
//         const url = routerOptions.prefix ? routerOptions.prefix + urlPath : urlPath;
//         return router['get'](url, describe.value);
//     }
// }

// export const post = (urlPath: string, routerOptions: RouteOptions = {}) => {
//     //装饰器
//     return (target, key: string, describe: any) => {
//         const url = routerOptions.prefix ? routerOptions.prefix + urlPath : urlPath;
//         return router['post'](url, describe.value);
//     }
// }

// 2. 优化: 提取公共方法
// const method = (method: HTTPMethod) => (urlPath: string, routerOptions: RouteOptions = {}) => {
//     //装饰器
//     // describe.value  === target[key]
//     return (target, key: string, describe: any) => {
//         const url = routerOptions.prefix ? routerOptions.prefix + urlPath : urlPath;
//         return router[method](url, target[key]);
//     }
// }

//3. 优化：提取装饰器方法
const method = (method: HTTPMethod) => (urlPath: string, routerOptions: RouteOptions = {}) => decorate(method, urlPath, routerOptions, router);

// const decorate = (method: HTTPMethod, path: string, routerOptions: RouteOptions = {}, router: KoaRouter) => {
//     return (target, key: string, describe: any) => {
//         const url = routerOptions.prefix ? routerOptions.prefix + path : path;
//         return router[method](url, target[key]);
//     }
// }

// 4.完善：处理中间件
// const decorate = (method: HTTPMethod, path: string, routerOptions: RouteOptions = {}, router: KoaRouter) => {
//     return (target, key: string, describe: any) => {
//         let middlewares = [];
//         // 若设置了中间件选项则加入到中间件数组
//         if (routerOptions.middlewares) {
//             middlewares.push(...routerOptions.middlewares);
//         }

//         // 添加路由处理器
//         middlewares.push(target[key]);

//         const url = routerOptions.prefix ? routerOptions.prefix + path : path;
//         return router[method](url, ...middlewares);
//     }
// }

// 5.完善: 类的中间件
const decorate = (method: HTTPMethod, path: string, routerOptions: RouteOptions = {}, router: KoaRouter) => {
    return (target, key: string, describe: any) => {
        process.nextTick(() => {
            let middlewares = [];
            // 若设置了类的中间件，则加入中间件数组
            if (target.middlewares) {
                middlewares.push(...target.middlewares);
            }
            // 若设置了方法中间件选项则加入到中间件数组
            if (routerOptions.middlewares) {
                middlewares.push(...routerOptions.middlewares);
            }

            // 添加路由处理器
            middlewares.push(target[key]);

            const url = routerOptions.prefix ? routerOptions.prefix + path : path;
            return router[method](url, ...middlewares);
        })
    }
}

export const middlewares = (middlewares: Koa.Middleware[]) => {
    return (target, key: string, describe: any) => {
        target.prototype.middlewares = middlewares
    }
};

export const get = method('get');
export const post = method('post');

export const load = (folder: string, loadOptions: LoadOptions = {}): KoaRouter => {
    const extname = loadOptions.extname || '.{js,ts}';
    const files = glob.sync(require('path').join(folder, `./**/*${extname}`));
    files.forEach(filePath => {
        require(filePath);
    });
    return router;
}


const validateRule = paramPart => rule => {
    return function (target, key, descriptor) {
        const oldValue = descriptor.value
        descriptor.value = function () {
            const ctx = arguments[0]
            const p = new Parameter()
            const data = ctx[paramPart]
            const errors = p.validate(rule, data)
            console.log('error',errors)
            if (errors) throw new Error(JSON.stringify(errors))
            return oldValue.apply(null, arguments);
        }
        return descriptor;
    }
}

export const querystring = validateRule('query')
export const body = validateRule('body')