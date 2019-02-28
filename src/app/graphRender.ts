import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import { SelectedTest, drawSelectedPanel } from './queryObject';

export function removeThings(){
    d3.select('#linked-pathways').selectAll('*').remove();
    d3.select('#pathway-render').selectAll('*').remove();
    d3.select('#assoc-genes').selectAll('*').remove();
    d3.select('#gene-id').selectAll('*').remove();
}

export async function renderSidebar(data: Object){
    console.log('data', data)
    let sidebar = d3.select('#left-nav');
    let callTable = sidebar.select('.call-table');
    let geneDiv = callTable.selectAll('.gene').data([data]);
    geneDiv.exit().remove();
/*
    if(data.key != undefined){

        let geneEnterDiv = geneDiv.enter().append('div').attr('class', d=> d.key).classed('gene', true);
        let geneHeader = geneEnterDiv.append('div').classed('gene-header', true)
        geneHeader.append('text').text(d=> d.key);
        geneDiv = geneEnterDiv.merge(geneDiv);
    
        let variantBox = geneDiv.append('div').classed('variant-wrapper', true);
    
        let variants = variantBox.selectAll('.variant').data(d=>d.values);
        variants.exit().remove();
        let varEnter = variants.enter().append('div').classed('variant', true);
        let varText = varEnter.append('h5').text(d=>d.id);
        let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
        let blurbs = varDes.selectAll('.blurb').data(d=>d3.entries(d)).enter().append('div').classed('blurb', true);
        blurbs.append('text').text(d=> d.key + ": "+ d.value);

        variants = varEnter.merge(variants);
  
        variants.on('click', function(d){
            console.log(d);
            let blurb = d3.select(this).select('.var-descript');
            blurb.classed('hidden')? blurb.classed('hidden', false) : blurb.classed('hidden', true);
    
        });

    }else{*/
       // console.log('data value', data.value)
        let geneEnterDiv = geneDiv.enter().append('div').attr('class', d=> d.value).classed('gene', true);
        let geneHeader = geneEnterDiv.append('div').classed('gene-header', true)
        geneHeader.append('text').text(d=> d.value);
        geneDiv = geneEnterDiv.merge(geneDiv);
    
        let variantBox = geneDiv.append('div').classed('variant-wrapper', true);
    
        let variants = variantBox.selectAll('.variant').data(d=>d.properties.allelicVariantList);
        variants.exit().remove();
        let varEnter = variants.enter().append('div').classed('variant', true);
        let varText = varEnter.append('h5').text(d=>d.dbSnps);
        let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
        let blurbs = varDes.selectAll('.blurb').data(d=>d3.entries(d).filter(f=> f.key != 'allelicVariantList')).enter().append('div').classed('blurb', true);
        blurbs.append('text').text(d=> d.key + ": "+ d.value);

        variants = varEnter.merge(variants);
  
        variants.on('click', function(d){
            let blurb = d3.select(this).select('.var-descript');
            blurb.classed('hidden')? blurb.classed('hidden', false) : blurb.classed('hidden', true);
    
        });
 //   }
  
   
}

export async function renderGeneDetail(data: Object){
    console.log(data);
    let headers = d3.keys(data.properties).filter(d=> d != 'allelicVariantList' && d != 'referenceList');
    
    let sidebar = d3.select('#left-nav');
    let geneDet = sidebar.select('.gene-detail');
    let geneHeader = geneDet.append('div').attr('class', 'detail-head').append('h3').text(data.value);
    let propertyDivs = geneDet.selectAll('.prop-headers').data(headers);
    let propEnter = propertyDivs.enter().append('div').classed('prop-headers', true);
    propEnter.append('h4').text((d)=> d)
   // let sections = propEnter.selectAll('.sections').data(d=> data.properties[d]);
   // let secEnter = sections.enter().append('div').classed('sections', true);
    //sections = secEnter.merge(sections);
    let titles = propEnter.filter(d=> d == "titles");
    let titleSec = titles.selectAll('.sections').data(d=> d3.entries(data.properties[d]));
    let titleEnter = titleSec.enter().append('div').classed('title sections', true);
    titleEnter.append('text').text(d=> d.value);

    let geneMap = propEnter.filter(d=> d == 'geneMap');
    let geneSec = geneMap.selectAll('.sections').data(d=> {
        console.log(d3.entries(data.properties[d]).filter(d=> d.key != "phenotypeMapList"));
        return d3.entries(data.properties[d]).filter(d=> d.key != "phenotypeMapList");
    });
    let geneEnter = geneSec.enter().append('div').classed('geneMap sections', true);
    geneEnter.append('text').text(d=> d.key + ': ' + d.value " <br>");

    let textProp = propEnter.filter(d=> d == 'text');
    let textSec = textProp.selectAll('.sections').data(d=> {
        return data.properties[d];
    });
    let textEnter = textSec.enter().append('div').classed('text sections', true);
    let headText = textEnter.append('h5').text(d=> d.textSectionTitle + ': ');
    let textText = textEnter.append('text').text(d=> d.textSectionContent);

    propertyDivs = propEnter.merge(propertyDivs);

    

}

export function drawGraph(data: Object) {
    console.log(data)
    let canvas = d3.select('#graph-render').select('.graph-canvas'),
        width = +canvas.attr("width"),
        height = +canvas.attr("height"),
        radius = 20;

    // Define the div for the tooltip
    var toolDiv = d3.select('.tooltip');

    let simulation = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(80).strength(.5))
        .force("x", d3.forceX(width / 2).strength(.05))
        .force("y", d3.forceY(height / 2).strength(.05))
        .force("charge", d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(300, 250));

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
        .attr("class", d => {
            return "node " + d.label;
        });

    let circles = nodeEnter.append('circle')
        //.attr("r", radius - .75)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    let geneNode = nodeEnter.filter(d => d.label == 'gene');

    let labels = geneNode.append('text').text(d => d.title).style('color', '#ffffff').attr('x', 0)
        .attr('y', 3).attr('text-anchor', 'middle');


    node.append("title")
        .text(function(d) { return d.title; });

    node = nodeEnter.merge(node);

    node.on('click', (d) => {
        SelectedTest.queryOb = d.data;
        drawGraph(data);
    });

    node.on("mouseover", function(d) {
            toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
            toolDiv.html(d.title + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            toolDiv.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
//YOU NEED TO FIX THE SELECTED NODE

        /*
    let selectedNode = node.filter(d => {
      
        node.classed('selected', false);
        return SelectedTest.queryOb != null ? d.title == SelectedTest.queryOb.name : null;
    });


    selectedNode != null ? selectedNode.classed('selected', true) : console.log('no node');

    SelectedTest.queryOb != null ? drawSelectedPanel(SelectedTest.queryOb) : console.log('no code');
*/
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