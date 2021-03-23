const { Command } = require('commander');
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const { spawn, exec } = require('child_process');

const packageJson = require('./package.json');

let projectName

console.log('----------process.argv', process.argv)

async function init() {
    const program = new Command(packageJson.name)
        .version(packageJson.version)   //设置版本号
        .arguments('<project-directory>')    //设置命令行的参数格式 <>必选 []可选
        .usage(`${chalk.green('<project-directory>')}`)
        .action(name => {
            projectName = name
        })
        .parse(process.argv);
    console.log(projectName);
    await createApp(projectName);

    if (typeof projectName === 'undefined') {
        console.error('Please specify the project directory:');
        console.log(
            `${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
        );
        console.log();
        console.log('For example:');
        console.log(
            `${chalk.cyan(program.name())} ${chalk.green('my-app')}`
        );
        process.exit(1);
    }
}

async function createApp(projectName) {
    let root = path.resolve(projectName);

    fs.ensureDirSync(projectName);  // 保证此目录存在，如果不存在，则创建

    console.log(`Creating a new React app in ${chalk.green(root)}.`);

    const packageJSON = {
        name: projectName,
        version: '1.0.0',
        private: true
    };

    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify(packageJSON, null, 2)  //  第二个参数是对第一个对象的方法，第三个参数是缩进
    )

    const originalDirecttory = process.cwd();
    process.chdir(root) // 改变工作目录

    console.log('----------appname', projectName);
    console.log('----------root', root);
    console.log('----------originalDirecttory', originalDirecttory);

    await run(projectName, root, originalDirecttory);

}

/**
 * 
 *  @param {*}  projectName //项目名字
 *  @param {*}  root  // 生成项目的绝对路径
 *  @param {*}  originalDirecttory // 原始的命令工作目录
 */
async function run(projectName, root, originalDirecttory) {
    let scriptName = 'cra-scripts'; //create生成的代码里，源文件编译，启动服务放在了scripts里
    let templeteName = 'react-scripts';
    const allDependencies = ['react', 'react-dom', scriptName, templeteName];

    console.log('Installing packages. This might take a couple of minutes.');

    console.log(
        `Installing ${chalk.cyan('react')}, ${chalk.cyan(
            'react-dom'
        )}, and ${chalk.cyan(scriptName)}${` with ${chalk.cyan(templeteName)}`
        }...`
    );

    await install(root, allDependencies);
    //项目的名字 项目根目录 verbose是否显示详细信息 原始的目录 模板名称
    let data = [projectName, root, true, originalDirecttory, templeteName];
    let source = `
    var init = require('react-scripts/scripts/init.js');
    init.apply(null, JSON.parse(process.argv[1]));
    `;
    await executeNodeScript({ cwd: process.cwd() }, data, source);
    console.log('Done.')
    process.exit(0);
}

async function install(root, allDependencies) {
    return new Promise(resolve => {
        const command = 'yarnpkg';
        const args = ['add', '--exact', ...allDependencies, '--cwd', root]

        console.log('----------', command, args)

        const child = spawn(command, args, { stdio: 'inherit' })
        child.on('close', resolve)  //监听close事件。触发resolve
    })
}

async function executeNodeScript({ cwd }, data, source) {
    return new Promise(resolve => {
        const child = spawn(
            process.execPath,   //node 可执行文件的路径
            ['-e', source, '--', JSON.stringify(data)],
            { cwd, stdio: 'inherit' }
        );
        child.on('close', resolve)
    })
}

module.exports = {
    init
};