var fs = require("fs")
let join = require('path').join;

FilesFlower = function () {
    console.log("hello world")
}

module.exports = FilesFlower

FilesFlower.prototype.ScanFileSystem = function () {

    /**
     * 
     * @param startPath  起始目录文件夹路径
     * @returns {Array}
     */
    function findSync(startPath) {
        let result = [];
        function finder(path) {
            let files = fs.readdirSync(path);
            files.forEach((val, index) => {
                let fPath = join(path, val);
                let stats = fs.statSync(fPath);
                let file = {}
                try {
                    if (stats.isDirectory()) finder(fPath);
                    if (stats.isFile()) {
                        file.path = fPath
                        file.size = stats.size
                        result.push(file);
                    }
                } catch{
                    file.path = fPath
                    file.size = stats.size
                    result.push(file)
                }
            });

        }
        finder(startPath);
        return result;
    }

    let fileNames = findSync('C://bash');
    console.log(fileNames)
}

