let fs = require("fs");
let join = require('path').join;
let d3 = require("d3");
const shell = require("electron").shell;
const os = require("os");

const { remote } = require("electron");
const { Menu, MenuItem } = remote;
let current;

//右键菜单
const menu = new Menu();
menu.append(new MenuItem({
    label: 'open in explorer',
    click: function () {
        if (current) {
            shell.showItemInFolder(current);
        }
    }
}));

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    menu.popup({ window: remote.getCurrentWindow() })
}, false);

FilesFlower = function (selector, w, h) {
    this.w = w;
    this.h = h;
    this.selector = selector;
    d3.select(selector).selectAll("svg").remove();

    this.svg = d3.select(selector).append("svg:svg")
        .attr('width', w)
        .attr('height', h)
        .attr('id', 'svgcanvas');

    this.svg.append("svg:rect")
        .style("stroke", "#999")
        .style("fill", "#fff")
        .attr('width', w)
        .attr('height', h)
        .attr('id', 'rectcanvas');


    this.loading = this.svg.append("svg:text")
        .attr('id', 'loading')
        .attr('dx', w / 2)
        .attr('dy', h * 0.8)
        .attr('text-anchor', 'middle')
        .text("loading")

    this.filestree = {};
    this.node = {};
    this.link = {};
}

module.exports = FilesFlower

FilesFlower.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;

    d3.select(this.selector).selectAll("svg").remove();

    this.svg = d3.select(this.selector).append("svg:svg")
        .attr('width', w)
        .attr('height', h)
        .attr('id', 'svgcanvas');

    this.svg.append("svg:rect")
        .style("stroke", "#999")
        .style("fill", "#fff")
        .attr('width', w)
        .attr('height', h)
        .attr('id', 'rectcanvas');
    this.update(null);
}

FilesFlower.prototype.update = async function (rootPath) {
    this.loading
        .attr('transform', 'translate(' + this.w / 2 + ',' + this.h / 2 + ')')
        .style('display', null);

    d3.select(this.selector).selectAll("g").remove();
    if (rootPath || this.checklist.length > 0) {
        if (rootPath)
            this.Clear(rootPath);
        this.filestree = await this.ScanFileSystem(rootPath);
    }

    this.loading
        .style('display', 'none');

    const nodes = this.flatten(this.filestree);
    //console.log(this.checklist)
    if (nodes.length === 1) {
        this.links = [];
    }

    this.svg.selectAll("text").remove();
    this.simulation = d3.forceSimulation(nodes)
        .force("link",
            d3.forceLink(this.links)
                .id(d => d.name)
                .distance(d => d.distance)
        )
        .force("charge",
            d3.forceManyBody()
                .strength(-30)
                .distanceMax(500))
        .force("center",
            d3.forceCenter(this.w / 2, this.h / 2));

    this.link = this.svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(this.links)
        .join("line")

    this.node = this.svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", sizec)
        .attr("fill", color)
        .call(this.drag(this.simulation))
        .on("click", this.click.bind(this))
        .on("mouseover", this.mouseover.bind(this))
        .on("mouseout", this.mouseout.bind(this));

    this.simulation.on("tick", () => {
        if (this.simulation.alpha() <= 0.05 || this.simulation.alpha() >= 0.95) {  // 足够稳定时，才渲染一次
            this.link
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
            this.node
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });

            if (this.simulation.alpha() <= 0.05)
                this.simulation.stop();
            console.log("randing")
        }

    });

    this.text = this.svg
        .append('svg:text')
        .attr('class', 'nodetext')
        .attr('dy', 0)
        .attr('dx', 0)
        .attr('text-anchor', 'middle');

    this.loading = this.svg.append("svg:text")
        .attr('id', 'loading')
        .attr('dx', this.w / 2)
        .attr('dy', this.h * 0.8)
        .attr('text-anchor', 'middle')
        .text("loading")
        .style('display', 'none')

    if (this.checklist.length > 0) {
        setTimeout(() => {
            this.update();

        }, 1000);
    }

}
sizec = d => {
    //if (!d.filesize || !d.root || !d.root.rawsize)
    //    console.log(d)
    var r = d.filesize / (d.root.rawsize + 1);
    return 5 + r * 200;
}
color = d => {
    if (d.root == d)
        return "#CD7054";
    switch (d.type) {
        case "dir":
            return "#9B30FF";
        case "file":
            return "#00CD66";
        case "open_dir":
            return "#EEB422";
        case "root_dir":
            return "#CD7054";
        default:
            break;
    }
    if (d.error)
        return "#f00";
}
FilesFlower.prototype.drag = function (simulation) {

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

FilesFlower.prototype.click = function (d) {
    if (d.type == "file")
        return;
    if (d.children) {
        d._children = d.children;
        d.children = null;
        d.type = "dir";
        d.filesize = d.rawsize;
    } else {
        d.children = d._children;
        d._children = null;
        d.type = "open_dir";
        d.filesize = 0;

    }
    this.update();
};

FilesFlower.prototype.readFile = function (file, parent) {
    try {
        var stats = fs.statSync(file.path);
        this.readcount++;
    } catch{
        stats.size = 0;
    }
    file.filesize = stats.size;
    file.rawsize = file.filesize;
    file.read = true;

    // 加入父节点
    parent._children.push(file);
    try {
        if (stats.isDirectory()) {
            file.type = "dir";
            //let subfile = this.finder(fPath, file);
            //totalsize += file.filesize;
            file.rawsize = 0;
        }
        if (stats.isFile()) {
            file.type = "file";
            totalsize += file.filesize;
            file.rawsize = file.filesize;
        }
    } catch{
        file.error = true;
    }
    let troot = file;
    while (troot != this.root) {
        troot.parent.rawsize += file.rawsize;
        if (troot.parent.type != "open_dir") {
            troot.parent.filesize = troot.parent.rawsize;
        }
        troot = troot.parent;
    }
}
var maxcount = 80;
FilesFlower.prototype.finder = function (path, parent) {
    if (!parent.read && parent.parent) {
        this.readFile(parent, parent.parent);
    }
    try {
        var files = fs.readdirSync(path);
    } catch{
        files = [];
    }

    var totalsize = 0;
    for (let index = 0; index < files.length; index++) {
        const val = files[index];
        let fPath = join(path, val);
        let file = {
            name: fPath,
            path: fPath,
            children: null,
            _children: [],
            error: false,
            parent: parent,
            root: parent.root,
            purename: val,
            read: false
        };

        if (this.readcount < maxcount) {
            this.readFile(file, parent);
        }

        this.newchecklist.push(file);

    }

    parent.filesize = totalsize;
    parent.rawsize = totalsize;
    return totalsize;
}

/**
   * 
   * @param startPath  起始目录文件夹路径
   * @returns {Array}
   */
FilesFlower.prototype.findSync = function () {
    let len = this.checklist.length;
    this.newchecklist = [];
    this.readcount = 0;

    for (let index = 0; index < len && index < maxcount; index++) {
        const element = this.checklist[index];

        if (this.checklist.length - len > maxcount)
            break;
        if (element != null && element != undefined) {
            if (element.type == "file") {
                this.comfiremlist.push(element);
                continue;
            }
            this.finder(element.path, element);
            this.comfiremlist.push(element);
        }

    }
    let remainlist = [];
    for (let remain = maxcount; remain < len; remain++) {
        const element = this.checklist[remain];
        remainlist.push(element);
    }

    this.checklist = remainlist.concat(this.newchecklist);
    this.newchecklist = null;
    return this.root;
}

/**
 * 根据根目录扫描文件系统
 */
FilesFlower.prototype.ScanFileSystem = function (path) {
    let fileNames = this.findSync();
    return new Promise((resolve) => {
        resolve(fileNames);
    })
}

FilesFlower.prototype.Clear = function (startPath) {
    this.checklist = [];
    this.comfiremlist = [];
    this.links = [];
    if (startPath) {
        var root = {
            name: startPath,
            path: startPath,
            purename: startPath,
            children: null,
            _children: [],
            type: "root_dir",
            filesize: 0,
            rawsize: 0,
            distance: 0,
            read: true
        };
        root.root = root;
        root.parent = root;
        this.root = root;
        this.checklist.push(root)
    }

}

// 展开树
FilesFlower.prototype.flatten = function (root) {
    //this.max = 0;
    var nodes = [];
    var i = 0;
    this.links = [];
    function recurse(node, nodes, links) {

        if (node.children) {
            node.size = node.children.reduce(function (p, v) {
                return p + recurse(v, nodes, links);
            }, 0);
        }

        if (!node.id) node.id = ++i;
        if (node.parent != null) {
            links.push({
                source: node.parent.name,
                target: node.name,
                distance: (node.parent.filesize + node.filesize) / node.root.rawsize * 200 + 30
            });
        }
        node.rsize = node.filesize / node.root.rawsize * 200 + 30
        nodes.push(node);
        return node.size;
    }

    root.size = recurse(root, nodes, this.links);
    return nodes;
}
const kb = 1024;
const mb = 1024 * 1024;
const gb = 1014 * 1024 * 1024;

function filesize2str(filesize) {
    if (filesize < kb)
        return filesize + " B";
    else if (filesize < mb)
        return (filesize / kb).toFixed(2) + " KB";
    else if (filesize < gb)
        return (filesize / mb).toFixed(2) + " MB"
    else return (filesize / gb).toFixed(2) + " GB"
}

FilesFlower.prototype.mouseover = function (d) {
    this.text.attr('transform', 'translate(' + d.x + ',' + (d.y - 5 - (d.children ? 3.5 : Math.sqrt(d.rsize) / 2)) + ')')
        .text(d.name + ": " + filesize2str(d.filesize))
        .style('display', null);
    current = d.name;
};

FilesFlower.prototype.mouseout = function (d) {
    this.text.style('display', 'none');
};

