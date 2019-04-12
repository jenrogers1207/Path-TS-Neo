import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import * as qo from './queryObject';
import { BaseType, select, geoIdentity, geoNaturalEarth1Raw, gray, map, dragDisable, selectAll, Primitive } from "D3";
const neoAPI = require('./neo4jLoader');
const app = require('./app');
const qo = require('./queryObject');
const toolbar = require('./toolbarRender');

export function graphRenderMachine(graphArray:Object, selectedGene:Array<object>){

    let dropdown = d3.select('#topnav').select('.dropdown');
    let dropButton = dropdown.select('.dropdown-toggle');
   
    let key = String(dropButton.text());

    const builder = {
        'Align by Gene' : drawGene,
        'Align by Gene Test' : drawGeneTest,
        'Align by Variants' : drawVars,
        'Align by Phenotype' : drawPhenotypesTest,
        'Whole Network' : drawGraph,
    }
   
    let fun = builder[key];
    fun(graphArray, selectedGene);
}

//helper function 
function assignPosition(node, position) {
    node.ypos = position;
    if (node.children.length === 0) return ++position;
    node.children.forEach((child) => {
        position = assignPosition(child, position);
    });
    return position;
}

let drawVars = async function(graphArray:Object, selectedGene:Array<object>){
    let canvas = d3.select('#graph-render').select('.graph-canvas');
    var toolDiv = d3.select('.tooltip');

    let graphVariants = graphArray.nodes.filter(d=> d.label == 'Variant');

    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();

    let col = {
        'pheno': 50,
        'gene': 400,
        'vars': 500
    }

    let nodes = canvas.select('.nodes');

    d3.select('#graph-render').style('height', ((graphVariants.length * 25)+ 75) + 'px');
    canvas.style('height', ((graphVariants.length * 25)+ 75) + 'px');

    let vartabs = nodes.selectAll('.var-tabs').data(graphVariants).enter().append('g').attr('class', (d)=> JSON.parse(d.properties.properties).Consequence).classed('var-tabs', true);

    vartabs.attr('transform', (d, i)=> 'translate(20,'+((i*25))+')');

    let rect = vartabs.append('rect').classed('wrapper', true).attr('width', 800).attr('height', 20).attr('y', 0).attr('rx', 5).attr('ry', 5);

    //let text = vartabs.append('text').text(d=> d.name).classed('var-head', true);
      
      const consLabels = ['missense_variant', 'frameshift_variant', 'stop_gained', 'inframe_deletion', 'regulatory_region_variant', 'stop_lost' ];

      let labels = d3.select('#graph-render').append('div').classed('render-label gene-label', true);//.append('svg');
      //  let labelG = labels.append('div').attr('transform', 'translate(75, 30)')
  
      let varDiv = labels.append('div').style('width', '450px');
      varDiv.append('text').text('Variants');//.attr('x', col.vars+15);
      let circLabel =   varDiv.append('svg').selectAll('circle-label').data(consLabels).enter().append('circle').attr('r', 3).attr('cx', (d,i)=> 10+(i*10)).attr('cy', 25);
      circLabel.attr('class', d=> d).classed('circle-label', true);
      labels.append('div').style('width', '430px').append('text').text('Gene');//.attr('x', col.gene+10);
      labels.append('div').style('width', '100px').append('text').text('Phenotype');//.attr('x', 0);


      circLabel.on('mouseover', function(d){
      
        toolDiv.transition()
        .duration(200)
        .style("opacity", .8);
        toolDiv.html(d)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
     })
     .on("mouseout", function(d) {
        toolDiv.transition()
            .duration(500)
            .style("opacity", 0);
    });

    let data = await selectedGene.map(m=> {
        let phenoList = []
        let varPhenoList = m.properties.Variants.map(v=> {
            let varpheno = v.properties.Phenotypes[0] != undefined? v.properties.Phenotypes.flatMap(d=> d): null;
            let clin = varpheno != null? varpheno.map(p=> p.disease_ids.filter(d=> d.organization == "OMIM")).flatMap(d=> d): null;
            
            if(clin != null){
                clin.flatMap(c=> c.accession).forEach(element => {
                phenoList.push(element);
            });
            }
            console.log('phenoList',phenoList)
           // v.level = 1;
            let childz = clin != null? clin.flatMap(c=> c.accession).map(m=> {
               return {'data': {'name': m, }, 'level': 2, 'ypos':0, 'children': []  } ;
            }): null;
            let vars = {'data': v, 'level':1, 'ypos': 0, 'children': childz }
            return vars;
        });

        console.log("varrPheno", varPhenoList)

        let filteredPheno = m.properties.Phenotypes[0]!= undefined? m.properties.Phenotypes.filter(p=> {
            console.log(p.properties.associatedGene, m);
            
            phenoList.indexOf(p.name) == -1 && p.properties.associatedGene == m.name
        }).map(f=> { 
            return {'data': f , 'level': 2, 'ypos':0, 'children': [] }}): null;
        
        let concatChil = filteredPheno != null? varPhenoList.concat(filteredPheno).map((t, i)=> {
            // let ypos = i+1;
                return t;
            }) : varPhenoList;

        console.log('concat',concatChil);
        
        let mom = {'data': m, 'ypos': 0, 'level': 0, 'children': concatChil}
    
        return mom;
    });

    assignPosition(data[0], 1);

    let flatArray = [];
    
    data[0].parent = null;
    data[0].children.forEach(child => {
        child.parent = data[0];
        flatArray.push(child);
        if(child.children.length > 0){
            child.children.forEach(c=> {
                c.parent = child;
                flatArray.push(c);
            })
        }
    });

}

let drawGeneTest = async function(graphArray:Object, selectedGeneP:Array<object>){
    let selectedGene = await Promise.resolve(selectedGeneP);

    console.log('grarphArrray', graphArray);

    let canvas = d3.select('#graph-render').select('.graph-canvas');
    var toolDiv = d3.select('.tooltip');
    
    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();

    const consLabels = ['missense_variant', 'frameshift_variant', 'stop_gained', 'inframe_deletion', 'regulatory_region_variant', 'stop_lost' ]

    let labels = d3.select('#graph-render').append('div').classed('render-label gene-label', true);

    labels.append('div').style('width', '120px').append('text').text('Gene');
    let varDiv = labels.append('div').style('width', '300px');
    varDiv.append('text').text('Variants');
    let circLabel =   varDiv.append('svg').selectAll('circle-label').data(consLabels).enter().append('circle').attr('r', 3).attr('cx', (d,i)=> 10+(i*10)).attr('cy', 25);
    circLabel.attr('class', d=> d).classed('circle-label', true);
    let phenoDiv = labels.append('div').style('width', '100px').append('text').text('Phenotype');//.attr('x', 0);

    function viewToggleInput(divClassName:any){
        let dropData = ['Whole Network', 'Align by Gene', 'Align by Gene Test', 'Align by Variants', 'Align by Phenotype']
        let dropdown = d3.select(divClassName).select('.dropdown');
        let dropButton = dropdown.select('.dropdown-toggle');
        dropButton.text(dropData[0]);
        let dropdownItems = dropdown.select('.dropdown-menu').selectAll('.dropdown-item').data(dropData);
        let dropEnter = dropdownItems.enter().append('a').classed('dropdown-item', true);
        dropEnter.attr('href', '#');
        dropEnter.text(d=> d);
        dropdownItems.merge(dropEnter);
    
        return dropdown;
    }

    circLabel.attr('class', d=> d).classed('circle-label', true);

    let geneData = graphArray.nodes.filter(d=> d.label.includes('Gene')).map(p=> {
        let node = qo.structGene(p);
        return node;
    });

    geneData = await Promise.all(geneData);

    let dropData = ['Whole Network', 'Align by Gene', 'Align by Gene Test', 'Align by Variants', 'Align by Phenotype']
  //  
   // let dropButton = dropdown.select('.dropdown-toggle');
   // dropButton.text(dropData[0]);
  //  let dropdownItems = dropdown.select('.dropdown-menu').selectAll('.dropdown-item').data(dropData);
   
/*
    let sortDrop = varDiv.append('div').append('div').classed('dropdown', true).selectAll('.dropdown-item').data(dropData);
    let dropButton = sortDrop.select('.dropdown-toggle');
    drop.text(dropData[0]);
    let dropdownItems = dropdown.select('.dropdown-menu').selectAll('.dropdown-item').data(dropData);
    let dropEnter = dropdownItems.enter().append('a').classed('dropdown-item', true);
    dropEnter.attr('href', '#');
    dropEnter.text(d=> d);
    dropdownItems.merge(dropEnter);
    */
    let sortButton = varDiv.append('span').classed('badge badge-pill badge-secondary', true).append('text').text('Sort');
    let groupButton = phenoDiv.append('span').classed('badge badge-pill badge-secondary', true).append('text').text('Expand');

    circLabel.on('mouseover', function(d){
        d3.select(this).attr('r', 6);
        toolDiv.transition()
        .duration(200)
        .style("opacity", .8);
        toolDiv.html(d)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
        d3.select(this).attr('r', 3);
        toolDiv.transition()
            .duration(500)
            .style("opacity", 0);
    });
    circLabel.on('click', function(d){
        d3.selectAll('.dimmed').classed('dimmed', false);
        if(d3.select(this).classed('selected-label')){
            d3.selectAll('.selected-label').classed('selected-label', false);
        }else{
            d3.selectAll('.selected-label').classed('selected-label', false);
            d3.select(this).classed('selected-label', true);
            let highlightVar = canvas.select('.nodes').selectAll('.gene').selectAll('.first');
            highlightVar.filter(h=> {
                return h.data.cons != d
            }).classed('dimmed', true);
          
            let notIt = circLabel.filter(c=> c != d);
            notIt.classed('dimmed', true);
        }
   
    });
 
    let selectedVariants = selectedGene[0].properties.Variants.length == 0? JSON.parse(graphArray.nodes.filter(n=> n.name == selectedGene[0].name)[0].properties.Variants) : selectedGene[0].properties.Variants;
 
    selectedGene[0].properties.Variants = selectedVariants;
   // let data = selectedGene.map(m=> {
    let data = geneData.map(m=> {
        console.log(m);

        let phenoList = []
        let varPhenoList = m.properties.Variants.map(v=> {
            let varpheno = v.properties.Phenotypes[0] != undefined? v.properties.Phenotypes.flatMap(d=> d): null;
            let clin = varpheno != null? varpheno.map(p=> p.disease_ids.filter(d=> d.organization == "OMIM")).flatMap(d=> d): null;
            if(clin != null){
                clin.flatMap(c=> c.accession).forEach(element => {
                phenoList.push(element);
            });
            }
            let childz = clin != null? clin.flatMap(c=> c.accession).map(x=> {
                let pheno = m.properties.Phenotypes.nodes? m.properties.Phenotypes.nodes : m.properties.Phenotypes;
                let index = pheno.map(d=> d.properties.name).indexOf(x);
                let datp = pheno[index] ? pheno[index]: null;
                let props = datp != null ? datp.properties.properties : null;
                let final = props != null && typeof(props) == 'string'? JSON.parse(props): props != null? props : null;
               return {'data': {'name': 'p'+x, 'properties': final, }, 'level': 2, 'ypos':0, 'children': []  } ;
            }): [];
            let vars = {'data': v, 'level':1, 'ypos': 0, 'children': childz }
            return vars;
        });
        let filteredPheno = m.properties.Phenotypes[0]!= undefined? m.properties.Phenotypes.filter(p=> phenoList.indexOf(p.name) == -1 && p.properties.associatedGene == m.name).map(f=> { 
            return {'data': f , 'level': 2, 'ypos':0, 'children': [] }}): null;
        let concatChil = filteredPheno != null? varPhenoList.concat(filteredPheno).map((t, i)=> {
                return t;
            }) : varPhenoList;
        let mom = {'data': m, 'ypos': 0, 'level': 0, 'children': concatChil}
        return mom;
    });

    let wrapperObject = {'children': data, 'data':{'name':'root'}}
    //assignPosition(data[0], 1);

    assignPosition(wrapperObject, 0);

    let flatArray = [];
    
    wrapperObject.parent = null;
    wrapperObject.children.forEach(child => {
        child.parent = wrapperObject;
        flatArray.push(child);
        if(child.children.length > 0){
            child.children.forEach(c=> {
                c.parent = child;
                flatArray.push(c);
            })
        }
    });

    var compact = async function(firstEl:any, secEl:any){
        canvas.selectAll('.pheno-text').remove();
        firstEl.transition().duration(2000).attr('transform', (d, i)=> 'translate(20,'+((i*15))+')');
        secEl.transition().duration(2000).attr('transform', (d, i)=> 'translate('+(210+(i*15))+',0)');
        let parent = firstEl.nodes().map(m=> m.parentNode);
        let pText = d3.selectAll(parent).select('text.gene-label');
        pText.transition().duration(2000).attr('transform', d=> 'translate(-130,0)');
        groupButton.text('Expand');

    }
    var spread = function(firstEl:any, secEl:any){
        firstEl.transition().duration(2000).attr('transform', d=> 'translate(20,'+(d.ypos * 15)+')');
        secEl.transition().duration(2000).attr('transform', (d, i)=> 'translate(210,'+(i * 15)+')');
        let parent = firstEl.nodes().map(m=> m.parentNode);
      
        let pText = d3.selectAll(parent).select('text.gene-label');
 
        pText.transition().duration(2000).attr('transform', d=> 'translate(-130,'+(d.ypos * 15)+')');
        groupButton.text('Collapse');
        let text = secEl.append('text').text(d=>{
            let texting = d.data.properties != undefined && d.data.properties.description!= null? d.data.properties.description : d.data.name;
            return texting;
        })
        text.classed('pheno-text', true).attr('transform', 'translate(50, 0)').attr('opacity', 0);
        text.transition().duration(3000).attr('opacity', 1);
    }

    d3.select('#graph-render').style('height', (flatArray.length * 50) + 'px');
    canvas.style('height', (flatArray.length* 50) + 'px');

    let nodeCanvas = canvas.select('.nodes').attr('transform', 'translate(150, 70)');
    let genebox = nodeCanvas.selectAll('.gene').data(wrapperObject.children);
    let geneEnter = genebox.enter().append('g').classed('gene', true);
    geneEnter.attr('transform', (d,i)=> 'translate(0,'+(d.ypos * 12)+')');
    let geneLabel = geneEnter.append('text').text(d=> d.data.name).attr('class', 'gene-label').attr('transform', 'translate(-120, 0)')

    let firstCol = geneEnter.selectAll('.first').data(d=> d.children).enter().append('g').attr('class', d=> d.data.properties.Consequence + ' ' +d.data.name).classed('first var-node', true);
    
    let circleV = firstCol.append('circle').attr('cx', 0).attr('cy', 0).attr('fill', 'blue').attr('r', 5);
    circleV.classed('pheno-g circ', true);
    let labelV = firstCol.append('text').text(d=> d.data.name).attr('transform', 'translate(20, 0)');

    let secondCol = firstCol.selectAll('.second').data(d=> d.children).enter().append('g').attr('class', d=> d.data.name /*+" "+ d.parent.data.name*/).classed('pheno-node', true).classed('second', true);

    compact(firstCol, secondCol);
 
    let circleSec = secondCol.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 5);
    circleSec.classed('pheno-g circ', true);

    groupButton.on('click', (d, i)=>{
        groupButton.text() == 'Collapse' ? compact(firstCol, secondCol).then(()=> canvas.selectAll('.pheno-text').remove()) :spread(firstCol, secondCol);
    });

    var groupBy = function(xs, key) {
        console.log(xs)
        return xs.reduce(function(rv, x) {
          (rv[x[key]] = rv[x[key]] || []).push(x);
          return rv;
        }, {});
      };

    sortButton.on('click', ()=>{
   
    let newSort = wrapperObject.children.map(c=> {
        let vas = c.data.properties.Variants.map(v=> {
            v.cons = v.properties.Consequence;
            return v;
        });
        c.data.properties.Variants = vas;
        let array =  groupBy(c.data.properties.Variants, 'cons');
        let vals = d3.entries(array);
        let flattened = vals.flatMap(d=> d.value)
        c.data.properties.Variants = flattened;
        c.data.label = ['Gene']
        return c.data;
    });
    
   
    console.log(newSort);
    let newgraph = {'nodes': newSort}
     // selectedGene[0].properties.Variants = array.flatMap(d=> d.value);
       drawGeneTest(newgraph, selectedGene);
    });

    let circles = d3.selectAll('.circ');

    circleV.on('mouseover', function(d){
        let matches = d3.selectAll('.'+d.data.name);
        matches.classed('highlight', true);
     
       let antiMatch = d3.selectAll('.gene').selectAll('.first').filter(function(c, i, g){ return d.data.name != c.data.name; });

        antiMatch.classed('dimmed', true);

        if(d.data.type == undefined){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.properties)
            .style("left", (d3.event.pageX + 55) + "px")
            .style("top", (d3.event.pageY - 15) + "px");
        }else if(d.data.type == 'Variant'){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.properties.Consequence)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        }
       
    });
   
    circleSec.on('mouseover', function(d){
        let matches = d3.selectAll('.'+d.data.name);
        matches.classed('highlight', true);
     
       let antiMatch = d3.selectAll('.gene').selectAll('.second').selectAll('.circ').filter(function(c, i, g){ return d.data.name != c.data.name; });

        antiMatch.classed('dimmed', true);
        
        if(d.data.type == undefined){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.properties)
            .style("left", (d3.event.pageX + 55) + "px")
            .style("top", (d3.event.pageY - 15) + "px");
        }else if(d.data.type == 'Variant'){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.properties.Consequence)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        }
       
    });
   
    circles.on('mouseout', function(d){
        let matches = d3.selectAll('.highlight');
        matches.classed('highlight', false);
        let antiMatch = d3.selectAll('.dimmed').classed('dimmed', false);
        toolDiv.transition()
        .duration(500)
        .style("opacity", 0);
    });

}
let drawGene = async function(graphArray:Object, selectedGene:Array<object>){
    let canvas = d3.select('#graph-render').select('.graph-canvas');
    var toolDiv = d3.select('.tooltip');
    
    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();

    let col = {
        'pheno': 50,
        'gene': 400,
        'vars': 500
    }
    const consLabels = ['missense_variant', 'frameshift_variant', 'stop_gained', 'inframe_deletion', 'regulatory_region_variant', 'stop_lost' ]

    let labels = d3.select('#graph-render').append('div').classed('render-label gene-label', true);//.append('svg');
    //  let labelG = labels.append('div').attr('transform', 'translate(75, 30)')
    labels.append('div').style('width', '430px').append('text').text('Gene');//.attr('x', col.gene+10);
    let varDiv = labels.append('div').style('width', '450px');
    varDiv.append('text').text('Variants');//.attr('x', col.vars+15);
    let circLabel =   varDiv.append('svg').selectAll('circle-label').data(consLabels).enter().append('circle').attr('r', 3).attr('cx', (d,i)=> 10+(i*10)).attr('cy', 25);
    circLabel.attr('class', d=> d).classed('circle-label', true);
    labels.append('div').style('width', '100px').append('text').text('Phenotype');//.attr('x', 0);

    circLabel.on('mouseover', function(d){
        
        toolDiv.transition()
        .duration(200)
        .style("opacity", .8);
        toolDiv.html(d)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
        toolDiv.transition()
            .duration(500)
            .style("opacity", 0);
    });

    let data = selectedGene.map(m=> {

        let phenoList = []
        let varPhenoList = m.properties.Variants.map(v=> {
            let varpheno = v.properties.Phenotypes[0] != undefined? v.properties.Phenotypes.flatMap(d=> d): null;
            let clin = varpheno != null? varpheno.map(p=> p.disease_ids.filter(d=> d.organization == "OMIM")).flatMap(d=> d): null;
            
            if(clin != null){
                clin.flatMap(c=> c.accession).forEach(element => {
                phenoList.push(element);
            });
            }
           // v.level = 1;
            let childz = clin != null? clin.flatMap(c=> c.accession).map(m=> {
               return {'data': {'name': 'p'+m, }, 'level': 2, 'ypos':0, 'children': []  } ;
            }): [];
            let vars = {'data': v, 'level':1, 'ypos': 0, 'children': childz }
            return vars;
        });

        let filteredPheno = m.properties.Phenotypes[0]!= undefined? m.properties.Phenotypes.filter(p=> phenoList.indexOf(p.name) == -1 && p.properties.associatedGene == p.name).map(f=> { 
            return {'data': f , 'level': 2, 'ypos':0, 'children': [] }}): null;
        

        let concatChil = filteredPheno != null? varPhenoList.concat(filteredPheno).map((t, i)=> {
                return t;
            }) : varPhenoList;
        
        let mom = {'data': m, 'ypos': 0, 'level': 0, 'children': concatChil}
    
        return mom;
    });


    assignPosition(data[0], 1);

    let flatArray = [];
    
    data[0].parent = null;
    data[0].children.forEach(child => {
        child.parent = data[0];
        flatArray.push(child);
        if(child.children.length > 0){
            child.children.forEach(c=> {
                c.parent = child;
                flatArray.push(c);
            })
        }
    });

    d3.select('#graph-render').style('height', (flatArray.length * 50) + 'px');
    canvas.style('height', (flatArray.length* 50) + 'px');

    var tree = d3.cluster()
    .size([flatArray.length* 20, 850]);

    var stratify = d3.stratify()
    .parentId(function(d) { return d.parent.data.name });

    var root = d3.hierarchy(data[0]);
    tree(root);

    var linkGroup = canvas.select('.links');

    linkGroup.attr('transform', 'translate(50, 60)')
    
    linkGroup.selectAll(".line")
    .data(root.descendants().slice(1))
        .enter().append("path")
        .attr("class", "line")
        .attr("d", function(d) {
        return "M" + d.y + "," + d.x
            + "C" + (d.parent.y + 100) + "," + d.x
            + " " + (d.parent.y + 100) + "," + d.parent.x
            + " " + d.parent.y + "," + d.parent.x;
    });
  
   let nodeGroup = canvas.selectAll('.nodes');
   nodeGroup.attr('transform', 'translate(50, 60)');
   
   var node = nodeGroup.selectAll(".node")
   .data(root.descendants())
   .enter().append("g")
   .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
   .attr("transform", function(d) { 
     return "translate(" + d.y + "," + d.x + ")"; 
   })

   let geneNodes = node.filter(d=> d.data.data.type == 'Gene').classed('gene-node', true);
   let varNodes = node.filter(d=> d.data.data.type == 'Variant');
   varNodes.attr('class', d=> d.data.data.properties.Consequence+' '+d.data.data.name).classed('var-node', true);
   let phenoNodes = node.filter(d=> d.data.data.type == undefined);
   phenoNodes.attr('class', d=> d.data.data.name).classed('pheno-node', true);

    node.on('mouseover', function(d){
        let matches = d3.selectAll('.'+d.data.data.name);
        matches.classed('highlight', true);
        if(d.data.data.type == undefined){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.data.properties)
            .style("left", (d3.event.pageX + 55) + "px")
            .style("top", (d3.event.pageY - 15) + "px");
        }else if(d.data.data.type == 'Variant'){
            toolDiv.transition()
            .duration(200)
            .style("opacity", .8);
            toolDiv.html(d.data.data.properties.Consequence)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        }
       
    });
   
    node.on('mouseout', function(d){
        let matches = d3.selectAll('.highlight');
        matches.classed('highlight', false);
        toolDiv.transition()
        .duration(500)
        .style("opacity", 0);
    });

node.append("circle")
   .attr("r", 2.5);

node.append("text")
   .attr("dy", 3)
   .attr("x", function(d) { return d.children ? -8 : 8; })
   .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
   .text(function(d) { 
      // console.log(d);
     return d.data.data.name;
   });

}
async function restack(data, selectedName:string){

    let totalPheno:Array<object> = [];

    await data.forEach(async f=> {
        if(f.properties.associatedGene === selectedName){
            totalPheno.push(f);
        }
    });
     
    await data.forEach(async f=> {
       
        let selNames = totalPheno.map(s=> s.name);
      if(selNames.indexOf(f.name) == -1 ){
          totalPheno.push(f);
      }
    });

   return await Promise.all(totalPheno);

}
let drawPhenotypesTest = async function(graphArray:Object, selectedGene:Array<object>){

    let canvas = d3.select('#graph-render').select('.graph-canvas');
    var toolDiv = d3.select('.tooltip');
    
    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();
    let nodeCanvas = canvas.select('.nodes').attr('transform', 'translate(0, 0)');

    let col = {
        'pheno': 50,
        'gene': 400,
        'vars': 200
    }
    const consLabels = ['missense_variant', 'frameshift_variant', 'stop_gained', 'inframe_deletion', 'regulatory_region_variant', 'stop_lost' ]

    let labels = d3.select('#graph-render').append('div').classed('render-label pheno-label', true);

    labels.append('div').style('width', '415px').append('text').text('Phenotype');
    labels.append('div').style('width', '50px').append('text').text('Gene');
    let varDiv = labels.append('div').style('width', '380px');
    varDiv.append('text').text('Variants');//.attr('x', col.vars+15);
    let circLabel =   varDiv.append('svg').selectAll('circle-label').data(consLabels).enter().append('circle').attr('r', 3).attr('cx', (d,i)=> 10+(i*10)).attr('cy', 25);
    circLabel.attr('class', d=> d).classed('circle-label', true);

    let groupButton = varDiv.append('span').classed('badge badge-pill badge-secondary', true).append('text').text('Ungroup');
    let stackButton = varDiv.append('span').classed('badge badge-pill badge-secondary', true).append('text').text('Expand');

    let phenoData = graphArray.nodes.filter(d=> d.label == 'Phenotype').map(p=> {
        let phen = p.properties;
        phen.properties = typeof p.properties.properties == 'string' ? JSON.parse(p.properties.properties) : p.properties.properties;
        return phen;
    });

    d3.select('#graph-render').style('height', (phenoData.length * 90) + 'px');
    canvas.style('height', (phenoData.length * 90) + 'px');

    var collapse = async function(el:any, level:number){
        let move = [50, 200, 400]
        canvas.selectAll('.pheno-text').transition().duration(2000).attr('opacity', 0);
        el.transition().duration(2000).attr('transform', (d, i)=> 'translate('+move[level]+','+((i*25))+')');
        stackButton.text('Expand');
    }
    var spread = function(el:any, level:number){
        let move = [50, 200, 400]
        canvas.selectAll('.pheno-text').remove();
        el.transition().duration(2000).attr('transform', d=> 'translate('+move[level]+','+(d.ypos * 2)+')');
        stackButton.text('Collapse');
      
        /*
        let text = secEl.append('text').text(d=>{
            let texting = d.data.properties != undefined && d.data.properties.description!= null? d.data.properties.description : '';
            return texting;
        })
        text.classed('pheno-text', true).attr('transform', 'translate(50, 0)').attr('opacity', 0);
        text.transition().duration(3000).attr('opacity', 1);
*/
    }

    let variants = graphArray.nodes.filter(d=> d.label == 'Variant').map(v=> {
        let varName = v.name;
        let props = typeof v.properties.properties == 'string' ? JSON.parse(v.properties.properties) : v.properties.properties;
        let pheno = props.Phenotypes[0] != undefined? props.Phenotypes.flatMap(d=> d): null;
        let clin = pheno != null? pheno.map(p=> p.disease_ids.filter(d=> d.organization == "OMIM")).flatMap(d=> d): null;
        let gene = String(props.mutations).split(',');
       
        return {'name': v.name, 'properties': props, 'pheno': clin, 'gene': gene[0], 'children': [] };
    });

    variants = variants.filter(v=> v.gene != 'undefined');

    let newVars = d3.nest().key(function(d) { return d.gene; })
    .entries(variants);

    let newPheno = await phenoData.map(async p=> {
        let pheno = p;
        pheno.name = p.name;

        let allvars = await newVars.filter(v=> {
            return v.key == p.properties.associatedGene});

        p.children = allvars[0].values != undefined? allvars.map(all=> {
            let geneName = all.key;
            let children = all.values;
            let filtered = children.filter(c=> {
                let ids = c.pheno.map(m=> m.accession);
                return ids.includes(p.name);
            })
      
            let data = {'type': 'Gene'};
            return {'name': geneName, 'children': filtered, 'data':data }
        }) : [];
 
        return pheno;

    });
    
    let finalPheno = {'children': await Promise.all(newPheno), 'name': 'root' };

    assignPosition(finalPheno, 1);

    canvas.style('height', (150*phenoData.length) + 'px');
   
    circLabel.on('mouseover', function(d){
      
        toolDiv.transition()
        .duration(200)
        .style("opacity", .8);
        toolDiv.html(d)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
     })
     .on("mouseout", function(d) {
        toolDiv.transition()
            .duration(500)
            .style("opacity", 0);
    });

    let drawTabs = async function(data, selectedName:string){

        let node = canvas.select('.nodes').append('g').classed('pheno-wrap', true).selectAll('.pheno-tab').data(data.children);

        let nodeEnter = node
            .enter().append('g')
            .attr("class", (d)=> 'pheno-tab '+d.name);

        let geneNode = nodeEnter.selectAll('.gene').data(d=> d.children);
        let geneEnter = geneNode.enter().append('g').attr('class', d=> d.name).classed('gene first', true);

        nodeEnter.transition().duration(2000).attr('transform', (d, i) => 'translate(50, '+(i * 25)+')');
        geneEnter.transition().duration(2000).attr('transform', (d, i) => 'translate(300, '+(i * 0)+')');

        let circleP = nodeEnter.append('circle').attr('cx', 0).attr('cy', 100);
        circleP.attr('class', d=> d.name).classed('pheno-c', true);

        let textP = nodeEnter.append('text').text(d=> d.properties.description);
        textP.attr('x', 16).attr('y', 100);

        let circleG = geneEnter.append('circle').attr('cx', 0).attr('cy', 100);
        circleG.attr('class', d=> d.name).classed('pheno-g', true);

        let textG = geneEnter.append('text').text(d=> d.name);
        textG.attr('x', 16).attr('y', 100);

        return nodeEnter;

    }

    let drawVars = function(nodeEnter, grouped:Boolean){
       
        nodeEnter.select('.var-wrapper').remove();

        if(grouped){
            let circleVar = nodeEnter.append('g').classed('var-wrapper', true).selectAll('.vars').data(d=> d3.entries(d.children));

            circleVar.exit().remove();

            let circEnter = circleVar.enter().append('g').attr('class', d=> d.key).classed('vars second', true);
            circEnter.attr('transform', (d,i)=> 'translate('+(col.vars + (i*21))+', 100)');
            let circ = circEnter.append('circle').attr('r', 10).attr('cx', 5).attr('cy', 0);
            let count = circEnter.append('text').text(d=> d.value.length).attr('y', 3);
            circleVar = circEnter.merge(circleVar);

            circ.on('mouseover', function(d){          
                toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
                toolDiv.html(d.value.length +"<br/>"+ d.key + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
             })
             .on("mouseout", function(d) {
                toolDiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
            return circEnter;
        }else{

            let circleVar = nodeEnter.append('g').classed('var-wrapper', true).selectAll('.vars').data(d=> d.children);

            circleVar.exit().remove();

            let circEnter = circleVar.enter().append('g').attr('class', d=> d.properties.Consequence+' '+d.vname).classed('vars second ungrouped', true);
            circEnter.attr('transform', (d,i)=> 'translate('+(col.vars + (i*11))+', 100)');
            let circ = circEnter.append('circle').attr('r', 5).attr('cx', 5).attr('cy', 0);

            circleVar = circEnter.merge(circleVar);
            circ.on('mouseover', function(d){
            
                let matches = d3.selectAll('.'+d.vname);
                matches.classed('highlight', true);

                toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
                toolDiv.html(d.vname + "<br/>" + d.properties.Consequence + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 50) + "px");
             })
             .on("mouseout", function(d) {
                let matches = d3.selectAll('.highlight');
                matches.classed('highlight', false);

                toolDiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
            return circEnter;
        }
    }

    let groupVars = async function(buttonEl: any, drawEl:any){
      
        let gene = drawEl.data();
       
        let newPhen = gene.map(m=> {
                let varGroups:object = { };
                m.children.forEach(v => {
                    let key = v.properties.Consequence;
                    if(d3.keys(varGroups).includes(key)){
                        varGroups[key].push(v)
                    }else{
                        varGroups[key] = [v]
                    }
                });
                m.children = varGroups;
        
            return m;
        });

        d3.select(buttonEl).text('Ungroup');
        drawVars(drawEl, true);
        let varEnter = drawVars(drawEl, true);
        return varEnter;
    }

    let ungroupVars = async function(buttonEl: any, drawEl:any){
        
        let gene = drawEl.data();
        let newPhen = gene.map(m=> {
                let flatVar = d3.entries(m.children).map(d=> d.value);
                m.children = flatVar.flatMap(d=> d);
                return m;
        });
   
        d3.select(buttonEl).text('Group');
        let varEnter = drawVars(drawEl, false);
        return varEnter;
    }

    let enterNode = await drawTabs(finalPheno, selectedGene[0].name);
    let geneNode = enterNode.selectAll('.gene.first');
   // let varNode = geneNode.select('g').selectAll('g');

    let varNode = await groupVars(groupButton, geneNode);

    groupButton.on('click', async function(){
        d3.select(this).text() == 'Group' ? varNode = await groupVars(this, geneNode) :  varNode = await ungroupVars(this, geneNode);
    });
    stackButton.on('click', function(){
        if(d3.select(this).text() == 'Expand'){
            spread(enterNode, 0);
            spread(varNode, 2);
        }else{
            collapse(enterNode, 0);
            collapse(varNode, 2);
        } 
    })
    
}

let drawPhenotypes = async function(graphArray:Object, selectedGene:Array<object>){

    let canvas = d3.select('#graph-render').select('.graph-canvas');
    var toolDiv = d3.select('.tooltip');
    
    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();
    let nodeCanvas = canvas.select('.nodes').attr('transform', 'translate(0, 0)');

    let col = {
        'pheno': 50,
        'gene': 400,
        'vars': 500
    }
    const consLabels = ['missense_variant', 'frameshift_variant', 'stop_gained', 'inframe_deletion', 'regulatory_region_variant', 'stop_lost' ]

    let labels = d3.select('#graph-render').append('div').classed('render-label pheno-label', true);//.append('svg');
  //  let labelG = labels.append('div').attr('transform', 'translate(75, 30)')
    labels.append('div').style('width', '415px').append('text').text('Phenotype');//.attr('x', 0);
    labels.append('div').style('width', '50px').append('text').text('Gene');//.attr('x', col.gene+10);
    let varDiv = labels.append('div').style('width', '380px');
    varDiv.append('text').text('Variants');//.attr('x', col.vars+15);
    let circLabel =   varDiv.append('svg').selectAll('circle-label').data(consLabels).enter().append('circle').attr('r', 3).attr('cx', (d,i)=> 10+(i*10)).attr('cy', 25);
    circLabel.attr('class', d=> d).classed('circle-label', true);

    let groupButton = varDiv.append('span').classed('badge badge-pill badge-secondary', true).append('text').text('Ungroup');

    let geneData = graphArray.nodes.filter(d=> d.label == 'Gene');

    let phenoData = graphArray.nodes.filter(d=> d.label == 'Phenotype').map(p=> {
        let phen = p.properties;
        phen.properties = typeof p.properties.properties == 'string' ? JSON.parse(p.properties.properties) : p.properties.properties;
        return phen;
    });

    d3.select('#graph-render').style('height', (phenoData.length * 90) + 'px');
    canvas.style('height', (phenoData.length * 90) + 'px');

    let variants = graphArray.nodes.filter(d=> d.label == 'Variant').map(v=> {
        let varName = v.name;
      
        let props = typeof v.properties.properties == 'string' ? JSON.parse(v.properties.properties) : v.properties.properties;
        let pheno = props.Phenotypes[0] != undefined? props.Phenotypes.flatMap(d=> d): null;
        let clin = pheno != null? pheno.map(p=> p.disease_ids.filter(d=> d.organization == "OMIM")).flatMap(d=> d): null;
        let gene = String(props.mutations).split(',');
       
        return {'name': v.name, 'props': props, 'pheno': clin, 'gene': gene[0]};
    });

    variants = variants.filter(v=> v.gene != 'undefined');

    let newVars = d3.nest().key(function(d) { return d.gene; })
    .entries(variants);

    let newPheno = await phenoData.map(async p=> {
        let pheno = p;
        pheno.name = p.name;
      
        pheno.allvars = await newVars.filter(v=> v.key == p.properties.associatedGene).map(m=> m.values)[0];
 
        if(pheno.allvars[0]!= undefined){
            let vars = pheno.allvars.map(v=> {
                let vPheno = v.pheno != null? v.pheno.filter(f=> f.accession == String(p.properties.phenotypeMimNumber)) : null;
                return { 'vname': v.name, 'phenoid': vPheno, 'props':v.props }
            });
            pheno.vars = vars.filter(f=> f.phenoid != null && f.phenoid.length > 0);
        }else{
            pheno.vars = null;
        }
        return pheno;
    });


    let totalPheno = await restack(await Promise.all(newPheno), selectedGene[0].name);

    canvas.style('height', (150*phenoData.length) + 'px');
   
    circLabel.on('mouseover', function(d){
      
        toolDiv.transition()
        .duration(200)
        .style("opacity", .8);
        toolDiv.html(d)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
     })
     .on("mouseout", function(d) {
        toolDiv.transition()
            .duration(500)
            .style("opacity", 0);
    });

    let drawTabs = async function(data, selectedName:string){

        let pData = await Promise.all(data);
        let newData = pData.map((p,i)=>{
            let start = i == 0 ? 0 : pData[i-1].y;
            let y = i>0 && pData[i-1].properties.inheritance == undefined? start + 80 : start + 160; 
            p.y = i == 0 ? 0 : y;
            p.h = p.properties.inheritance == undefined? 78 : 158; 
            return p;
        });

        let node = canvas.select('.nodes').append('g').classed('pheno-wrap', true).selectAll('.pheno-tab').data(newData);

        let nodeEnter = node
            .enter().append('g')
            .attr("class", (d)=> 'pheno-tab '+d.name);

        nodeEnter.attr('transform', (d, i)=> {
            return 'translate(100, '+d.y+')'});

        let selectedNode = nodeEnter.filter(n=>  n.properties.associatedGene === selectedName);

        let selectedRects = selectedNode.append('rect')
        selectedRects.attr('x', -50).attr('y', 66).attr('rx', 15).attr('ry', 15).attr('width', 1000);
        selectedRects.attr('height', d=>  d.h).attr('fill','gray').style('opacity', '0.15');
    
        let circleP = nodeEnter.append('circle').attr('cx', 0).attr('cy', 100);
        circleP.classed('pheno-c', true);

        circleP.on('click', async (d)=>{
       
            let newPheno = await Promise.resolve(search.searchOMIMPheno(d));
            let nameArr = data.map(m=> m.name);
            let index = nameArr.indexOf(newPheno.name);
            data[index] = newPheno;
            canvas.select('.links').selectAll('*').remove();
            canvas.select('.nodes').selectAll('*').remove();
            let newTabs = await drawTabs(data, selectedName);
            groupButton.text() == 'Group' ? drawVars(newTabs, false) :drawVars(newTabs, true);
           
        });
    
        let textBlurb = nodeEnter.append('g').selectAll('text').data(d=> d3.entries(d.properties).filter(k=> k.key != 'associatedGene' && k.key != 'phenotypeMappingKey' && k.key != 'OMIM'));
        textBlurb.enter().append('text').text(d=> {
            if(d.key == 'description'){return d.value
            }else{
            return  d.key+': '+ d.value;
            }
           
        }).attr('x', col.pheno).attr('y', (d, i)=> 90 + (i* 15));
    
        let circleG = nodeEnter.append('circle').attr('cx', col.gene).attr('cy', 100);
        circleG.classed('pheno-g', true);
    
        nodeEnter.append('text').text(d=> d.properties.associatedGene).attr('x', col.gene - 15).attr('y', 86);

        return nodeEnter;

    }

    let drawVars = function(nodeEnter, grouped:Boolean){
       
        nodeEnter.select('.var-wrapper').remove();
        if(grouped){

            let circleVar = nodeEnter.append('g').classed('var-wrapper', true).selectAll('.pheno-v').data(d=> {
                let dat = d3.entries(d.vars);
                return dat;
            });

            circleVar.exit().remove();

            let circEnter = circleVar.enter().append('g').attr('class', d=> d.key).classed('pheno-v', true);
            circEnter.attr('transform', (d,i)=> 'translate('+(col.vars + (i*21))+', 100)');
            let circ = circEnter.append('circle').attr('r', 10).attr('cx', 5).attr('cy', 0);
            let count = circEnter.append('text').text(d=> d.value.length).attr('y', 3);
            circleVar = circEnter.merge(circleVar);

            circ.on('mouseover', function(d){          
                toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
                toolDiv.html(d.value.length +"<br/>"+ d.key + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
             })
             .on("mouseout", function(d) {
                toolDiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        }else{

            let circleVar = nodeEnter.append('g').classed('var-wrapper', true).selectAll('.pheno-v').data(d=> d.vars);

            circleVar.exit().remove();

            let circEnter = circleVar.enter().append('g').attr('class', d=> d.props.Consequence+' '+d.vname).classed('pheno-v', true);
            circEnter.attr('transform', (d,i)=> 'translate('+(col.vars + (i*11))+', 100)');
            let circ = circEnter.append('circle').attr('r', 5).attr('cx', 5).attr('cy', 0);

            circleVar = circEnter.merge(circleVar);
            circ.on('mouseover', function(d){
            
                let matches = d3.selectAll('.'+d.vname);
                matches.classed('highlight', true);

                toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
                toolDiv.html(d.vname + "<br/>" + d.props.Consequence + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 50) + "px");
             })
             .on("mouseout", function(d) {
                let matches = d3.selectAll('.highlight');
                matches.classed('highlight', false);

                toolDiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        }
    }

    let groupVars = async function(thisEl: any, pheno: any){
        let phen = await Promise.all(pheno);
        let newPhen = phen.map(p=> {
            let varGroups:object = { };
            p.vars.forEach(v => {
                let key = v.props.Consequence;
                if(d3.keys(varGroups).includes(key)){
                    varGroups[key].push(v)
                }else{
                    varGroups[key] = [v]
                }
            });
            p.vars = varGroups;
            return p;
        });
        d3.select(thisEl).text('Ungroup');
        drawVars(enterNode, true);
    }

    let ungroupVars = async function(thisEl: any, pheno: any){
        
        let phen = await Promise.all(pheno);
        let newPhen = phen.map(p=> {
            let flatVar = d3.entries(p.vars).map(d=> d.value);
            p.vars = flatVar.flatMap(d=> d);
            return p;
        });
   
        d3.select(thisEl).text('Group');
        drawVars(enterNode, false);
    }

    groupButton.on('click', function(){
        d3.select(this).text() == 'Group' ? groupVars(this, newPheno) : ungroupVars(this, newPheno);
    });

    let enterNode = await drawTabs(totalPheno, selectedGene[0].name);
    groupVars(groupButton, totalPheno);
}

function drawGraph(graphArray: Object, selectedGene: Array<object>) {

    let selectedNames = selectedGene.map(m=> m.name);

    let data = graphArray;

    let canvas = d3.select('#graph-render').select('.graph-canvas'),
        width = +canvas.attr("width"),
        height = +canvas.attr("height"),
        radius = 20;

    canvas.select('.links').selectAll('*').remove();
    canvas.select('.nodes').selectAll('*').remove();
    d3.selectAll('.render-label').remove();

    // Define the div for the tooltip
    var toolDiv = d3.select('.tooltip');

    let simulation = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(120).strength(.5))
        .force("x", d3.forceX(width / 2).strength(.05))
        .force("y", d3.forceY(height / 2).strength(.05))
        .force("charge", d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(400, 250));

    var link = canvas.select('.links')
        .selectAll(".line")
        .data(data.links);

    link.exit().remove();

    let linkEnter = link
        .enter().append("line")
        .classed('line', true)
        .attr("stroke-width", 2)
        .attr('stroke', '#9999');

    link = linkEnter.merge(link);

    let node = canvas.select('.nodes').selectAll('g').data(data.nodes);
    node.exit().remove();
    let nodeEnter = node
        .enter().append("g")
        .attr("class", function(d) {

            if(d.label.includes('Gene')){
                return "node Gene"
            }else{
                return 'node ' + d.label[0] + ' ' + d.name;
            }
        });

    let circles = nodeEnter.append('circle')
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
       
    let geneNode = nodeEnter.filter(d => d.label.includes('Gene'));

    nodeEnter.filter(d=> selectedNames.includes(d.name)).classed('selected', true);
    
    geneNode.classed("fixed", true);
    geneNode.classed("fixed", d=> d.fixed = true);

    function dragstart(d) {
        d3.select(this).classed("fixed", d.fixed = true);
      }

      dragstart(geneNode);

      var toggle = 0;
//Create an array logging what is connected to what
   
    let labels = geneNode.append('text').text(d => d.name).style('color', '#ffffff').attr('x', 0)
        .attr('y', 3).attr('text-anchor', 'middle');

    nodeEnter.append("title")
        .text(function(d) { return d.name; });

    node = nodeEnter.merge(node);

    node.on('click', async function(d){
       
        let mapped = qo.selected.queryKeeper.map(m=> m.name);
        canvas.select('.nodes').selectAll('.selected').classed('selected', false);
        d3.select(this).classed('selected', true);
        let newSelected = await qo.structGene(d);
        let queryKeeper = qo.allQueries.queryKeeper.map(m=> m);
        toolbar.renderGeneDetail([newSelected], graphArray);
        toolbar.renderCalls(queryKeeper, [newSelected]);

        if(mapped.includes(d.properties.name)){
            console.log('ALLREADY IN THE KEEPER');
            qo.selected.removeQueryOb(d.properties.name);
        }else{
            qo.selected.addQueryOb(d.properties);
        }      
    });

    node.on("mouseover", function(d) {
            toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
            if(d.label == 'Phenotype'){
                toolDiv.html(JSON.parse(d.properties.properties).description + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            }else{
                toolDiv.html(d.name + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            }
            
        })
        .on("mouseout", function(d) {
            toolDiv.transition()
                .duration(500)
                .style("opacity", 0);
    });

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

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
        if (!d3.event.active) simulation.alphaTarget(1);
        d.fx = null;
        d.fy = null;
    }

    function ticked() {
        link.attr("x1", d => {
            return d.source.x;
        }).attr("y1", d => {
            return d.source.y;
        }).attr("x2", d => {
            return d.target.x;
        }).attr("y2", d => {
            return d.target.y;
        });

        node
            .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });

    }

}